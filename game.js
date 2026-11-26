/**
 * Main Game Engine for Blade of Dawn (Swordigo-inspired HTML5 Adventure RPG).
 */
const SAVE_KEY = 'blade_of_dawn_save_v1';

class AdventureGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new window.GameRenderer(this.canvas);

        this.state = 'title'; // title | playing | dialogue | levelup | shop | levels | paused | gameover | victory
        this.keys = {};
        this.justPressed = {};

        this.currentLevelIdx = 0;
        this.unlockedLevel = 0;
        this.openedChests = new Set();
        this.level = window.WORLD_LEVELS[0];
        this.player = new window.Player(90, 490);
        this.checkpoint = { x: 90, y: 490 };

        this.camera = { x: 0, y: 0 };
        this.shake = 0;
        this.time = 0;
        this.playTime = 0;

        this.enemies = [];
        this.movingPlatforms = [];
        this.gates = [];
        this.switches = [];
        this.crystals = [];
        this.pots = [];
        this.chests = [];
        this.drops = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.floatingTexts = [];

        this.dialogueQueue = [];
        this.dialogueSpeaker = '';
        this.toastTimer = 0;
        this.crystalCooldown = 0;
        this.victoryTriggered = false;
        this.touchEnabled = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        this.bindUI();
        this.bindInputs();
        this.checkExistingSave();

        this.lastFrame = performance.now();
        requestAnimationFrame((ts) => this.loop(ts));
    }

    bindUI() {
        const $ = (id) => document.getElementById(id);

        $('btn-new-game').addEventListener('click', () => {
            window.Sound.init();
            this.startNewGame();
        });

        $('btn-continue').addEventListener('click', () => {
            window.Sound.init();
            this.continueSavedGame();
        });

        const touchCheckbox = $('toggle-touch');
        touchCheckbox.checked = this.touchEnabled;
        touchCheckbox.addEventListener('change', (e) => {
            this.touchEnabled = e.target.checked;
            $('touch-controls').classList.toggle('hidden', !(this.state === 'playing' && this.touchEnabled));
        });

        $('btn-mute').addEventListener('click', () => {
            const muted = window.Sound.toggleMute();
            $('btn-mute').textContent = muted ? '🔇' : '🔊';
        });

        $('btn-pause').addEventListener('click', () => this.togglePause());
        $('btn-help').addEventListener('click', () => this.togglePause());
        $('btn-resume').addEventListener('click', () => this.setState('playing'));
        $('btn-restart-level').addEventListener('click', () => {
            this.loadLevel(this.currentLevelIdx, true);
            this.setState('playing');
        });
        $('btn-to-title').addEventListener('click', () => this.returnToTitle());

        $('btn-map').addEventListener('click', () => this.openLevelSelect());
        $('btn-close-levels').addEventListener('click', () => this.setState('playing'));
        $('btn-close-shop').addEventListener('click', () => this.setState('playing'));

        $('btn-dialogue-next').addEventListener('click', () => this.advanceDialogue());

        $('btn-retry').addEventListener('click', () => this.respawnAtCheckpoint());
        $('btn-gameover-title').addEventListener('click', () => this.returnToTitle());

        $('btn-victory-continue').addEventListener('click', () => {
            this.victoryTriggered = false;
            this.openLevelSelect();
        });
        $('btn-victory-new').addEventListener('click', () => this.startNewGame());

        document.querySelectorAll('.upgrade-card').forEach((btn) => {
            btn.addEventListener('click', () => this.applyLevelUpChoice(btn.dataset.stat));
        });
    }

    bindInputs() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;

            if (e.code === 'Escape') {
                if (this.state === 'playing') this.setState('paused');
                else if (this.state === 'paused' || this.state === 'shop' || this.state === 'levels') this.setState('playing');
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch buttons
        document.querySelectorAll('.touch-btn').forEach((btn) => {
            const code = btn.dataset.key;
            const press = (ev) => {
                ev.preventDefault();
                window.Sound.init();
                if (!this.keys[code]) this.justPressed[code] = true;
                this.keys[code] = true;
            };
            const release = (ev) => {
                ev.preventDefault();
                this.keys[code] = false;
            };
            btn.addEventListener('pointerdown', press);
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointerleave', release);
            btn.addEventListener('pointercancel', release);
        });
    }

    checkExistingSave() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            document.getElementById('btn-continue').classList.remove('hidden');
        }
    }

    saveGame() {
        const payload = {
            levelIdx: this.currentLevelIdx,
            unlockedLevel: this.unlockedLevel,
            openedChests: Array.from(this.openedChests),
            player: this.player.serialize(),
            playTime: this.playTime
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
        } catch (_) {}
    }

    startNewGame() {
        localStorage.removeItem(SAVE_KEY);
        this.unlockedLevel = 0;
        this.openedChests = new Set();
        this.playTime = 0;
        this.victoryTriggered = false;
        this.player = new window.Player(90, 490);
        this.loadLevel(0, true);
        this.setState('playing');
        this.showToast('Selamat datang! Bicara dengan Tetua Eldrin [E] di sebelahmu.');
    }

    continueSavedGame() {
        try {
            const data = JSON.parse(localStorage.getItem(SAVE_KEY));
            if (!data) return this.startNewGame();
            this.unlockedLevel = data.unlockedLevel || 0;
            this.openedChests = new Set(data.openedChests || []);
            this.playTime = data.playTime || 0;
            this.victoryTriggered = false;
            this.player = new window.Player(90, 490);
            this.player.applySave(data.player);
            this.loadLevel(data.levelIdx || 0, true);
            this.setState('playing');
            this.showToast('Save dimuat! Lanjutkan petualanganmu.');
        } catch (_) {
            this.startNewGame();
        }
    }

    loadLevel(idx, resetPlayerPos = true) {
        this.currentLevelIdx = idx;
        this.unlockedLevel = Math.max(this.unlockedLevel, idx);
        this.level = window.WORLD_LEVELS[idx];
        this.victoryTriggered = false;

        this.movingPlatforms = this.level.movingPlatforms.map((mp) => ({
            ...mp,
            baseX: mp.x,
            baseY: mp.y,
            dx: 0,
            dy: 0
        }));
        this.gates = this.level.gates.map((g) => ({ ...g, open: false }));
        this.switches = this.level.switches.map((s) => ({ ...s, active: false }));
        this.crystals = this.level.crystals.map((c) => ({ ...c }));
        this.pots = this.level.pots.map((p) => ({ ...p, w: 28, h: 30, broken: false }));
        this.chests = this.level.chests.map((c) => ({
            ...c,
            w: 34,
            h: 34,
            opened: this.openedChests.has(c.id)
        }));
        this.enemies = this.level.enemies.map((sp) => new window.Enemy(sp));

        this.drops = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.particles = [];
        this.floatingTexts = [];

        if (resetPlayerPos) {
            this.player.x = this.level.spawn.x;
            this.player.y = this.level.spawn.y;
            this.player.vx = 0;
            this.player.vy = 0;
            this.checkpoint = { x: this.level.spawn.x, y: this.level.spawn.y };
        }

        document.getElementById('hud-stage-name').textContent = this.level.name;
        this.updateHud();
        this.saveGame();
    }

    setState(next) {
        this.state = next;
        const modals = ['screen-title', 'screen-levelup', 'screen-shop', 'screen-levels', 'screen-pause', 'screen-gameover', 'screen-victory'];
        modals.forEach((id) => document.getElementById(id).classList.add('hidden'));
        document.getElementById('dialogue-overlay').classList.add('hidden');

        const hud = document.getElementById('hud');
        if (next === 'title') {
            hud.classList.add('hidden');
            document.getElementById('screen-title').classList.remove('hidden');
            this.checkExistingSave();
        } else {
            hud.classList.remove('hidden');
        }

        if (next === 'dialogue') document.getElementById('dialogue-overlay').classList.remove('hidden');
        if (next === 'levelup') document.getElementById('screen-levelup').classList.remove('hidden');
        if (next === 'shop') document.getElementById('screen-shop').classList.remove('hidden');
        if (next === 'levels') document.getElementById('screen-levels').classList.remove('hidden');
        if (next === 'paused') document.getElementById('screen-pause').classList.remove('hidden');
        if (next === 'gameover') document.getElementById('screen-gameover').classList.remove('hidden');
        if (next === 'victory') document.getElementById('screen-victory').classList.remove('hidden');

        document.getElementById('touch-controls').classList.toggle('hidden', !(next === 'playing' && this.touchEnabled));
    }

    togglePause() {
        if (this.state === 'playing') this.setState('paused');
        else if (this.state === 'paused') this.setState('playing');
    }

    returnToTitle() {
        this.setState('title');
    }

    respawnAtCheckpoint() {
        this.player.hp = this.player.maxHp;
        this.player.mana = this.player.maxMana;
        this.player.x = this.checkpoint.x;
        this.player.y = this.checkpoint.y;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.invulnTimer = 1.2;
        this.enemyProjectiles = [];
        this.setState('playing');
        this.updateHud();
    }

    getSolidColliders() {
        const list = [...this.level.platforms, ...this.movingPlatforms];
        for (const g of this.gates) {
            if (!g.open) list.push({ x: g.x, y: g.y, w: g.w, h: g.h, kind: 'stone' });
        }
        return list;
    }

    loop(now) {
        const dt = Math.min(0.033, Math.max(0.001, (now - this.lastFrame) / 1000));
        this.lastFrame = now;
        this.time += dt;

        if (this.state === 'playing') {
            this.playTime += dt;
            this.update(dt);
        } else if (this.state === 'dialogue' && (this.justPressed['KeyE'] || this.justPressed['Space'] || this.justPressed['Enter'])) {
            this.advanceDialogue();
        }

        this.renderer.render(this);
        this.justPressed = {};
        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 28);
        if (this.toastTimer > 0) {
            this.toastTimer -= dt;
            if (this.toastTimer <= 0) document.getElementById('toast-box').classList.add('hidden');
        }
        if (this.crystalCooldown > 0) this.crystalCooldown -= dt;

        // Moving platforms
        for (const mp of this.movingPlatforms) {
            const oldX = mp.x;
            const oldY = mp.y;
            const wave = (Math.sin(this.time * mp.speed) + 1) / 2;
            if (mp.axis === 'x') mp.x = mp.baseX + wave * mp.range;
            else mp.y = mp.baseY - wave * mp.range;
            mp.dx = mp.x - oldX;
            mp.dy = mp.y - oldY;
        }

        this.updatePlayer(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updateDrops(dt);
        this.updateParticles(dt);
        this.updateCamera(dt);
        this.updateInteractHint();
        this.updateHud();
    }

    updatePlayer(dt) {
        const p = this.player;
        p.animTime += dt;
        p.mana = Math.min(p.maxMana, p.mana + 2.8 * dt);

        if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
        if (p.attackTimer > 0) p.attackTimer = Math.max(0, p.attackTimer - dt);
        if (p.attackCooldown > 0) p.attackCooldown = Math.max(0, p.attackCooldown - dt);
        if (p.comboResetTimer > 0) {
            p.comboResetTimer -= dt;
            if (p.comboResetTimer <= 0) p.comboStep = 0;
        }
        if (p.magicCooldown > 0) p.magicCooldown = Math.max(0, p.magicCooldown - dt);
        if (p.novaCooldown > 0) p.novaCooldown = Math.max(0, p.novaCooldown - dt);
        if (p.dropThroughTimer > 0) p.dropThroughTimer = Math.max(0, p.dropThroughTimer - dt);

        // Horizontal movement
        const left = this.keys['ArrowLeft'] || this.keys['KeyA'];
        const right = this.keys['ArrowRight'] || this.keys['KeyD'];
        const dir = (right ? 1 : 0) - (left ? 1 : 0);

        if (dir !== 0) {
            p.facing = dir;
            p.vx += (dir * 270 - p.vx) * Math.min(1, dt * 16);
        } else {
            p.vx *= Math.pow(0.001, dt);
            if (Math.abs(p.vx) < 4) p.vx = 0;
        }

        // Drop through thin platforms
        if ((this.justPressed['ArrowDown'] || this.justPressed['KeyS']) && p.onGround) {
            p.dropThroughTimer = 0.22;
        }

        // Jump & Double Jump with Coyote Time
        if (p.onGround) {
            p.coyoteTimer = 0.1;
            p.jumpsLeft = 2;
        } else {
            p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
        }

        if (this.justPressed['Space'] || this.justPressed['ArrowUp'] || this.justPressed['KeyW']) {
            p.jumpBuffer = 0.12;
        } else {
            p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
        }

        if (p.jumpBuffer > 0) {
            if (p.coyoteTimer > 0) {
                p.vy = -565;
                p.onGround = false;
                p.coyoteTimer = 0;
                p.jumpBuffer = 0;
                p.jumpsLeft = 1;
                window.Sound.jump(false);
                this.spawnBurst(p.x + p.w / 2, p.y + p.h, '#cbd5e1', 5);
            } else if (p.jumpsLeft > 0) {
                p.vy = -515;
                p.jumpsLeft = 0;
                p.jumpBuffer = 0;
                window.Sound.jump(true);
                this.spawnBurst(p.x + p.w / 2, p.y + p.h, '#38bdf8', 7);
            }
        }

        // Gravity
        p.vy = Math.min(920, p.vy + 1600 * dt);

        // Collisions X
        p.x += p.vx * dt;
        const solids = this.getSolidColliders();
        for (const s of solids) {
            if (s.kind === 'thin') continue;
            if (window.aabb(p, s)) {
                if (p.vx > 0) p.x = s.x - p.w;
                else if (p.vx < 0) p.x = s.x + s.w;
                p.vx = 0;
            }
        }
        p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));

        // Collisions Y
        const prevBottom = p.y + p.h;
        p.y += p.vy * dt;
        p.onGround = false;
        let standingPlatform = null;

        for (const s of solids) {
            if (s.kind === 'thin') {
                if (p.dropThroughTimer <= 0 && p.vy >= 0 && prevBottom <= s.y + 8 && window.aabb(p, s)) {
                    p.y = s.y - p.h;
                    p.vy = 0;
                    p.onGround = true;
                    standingPlatform = s;
                }
            } else if (window.aabb(p, s)) {
                if (p.vy > 0) {
                    p.y = s.y - p.h;
                    p.vy = 0;
                    p.onGround = true;
                    standingPlatform = s;
                } else if (p.vy < 0) {
                    p.y = s.y + s.h;
                    p.vy = 0;
                }
            }
        }

        if (standingPlatform && standingPlatform.dx !== undefined) {
            p.x += standingPlatform.dx;
            p.y += standingPlatform.dy;
        }

        // Sword Attack [J / Z]
        if ((this.justPressed['KeyJ'] || this.justPressed['KeyZ']) && p.attackCooldown <= 0) {
            p.comboStep = (p.comboStep % 3) + 1;
            p.attackTimer = 0.18;
            p.attackCooldown = p.comboStep === 3 ? 0.34 : 0.22;
            p.comboResetTimer = 0.65;
            p.hitTargets.clear();
            window.Sound.sword(p.comboStep);
            if (p.onGround) p.vx += p.facing * 55;
        }

        // Magic Bolt [K / X]
        if ((this.justPressed['KeyK'] || this.justPressed['KeyX']) && p.magicCooldown <= 0) {
            if (p.mana >= 12) {
                p.mana -= 12;
                p.magicCooldown = 0.38;
                window.Sound.magic();
                this.projectiles.push({
                    x: p.x + p.w / 2 + p.facing * 14,
                    y: p.y + p.h * 0.45,
                    vx: p.facing * 480,
                    vy: 0,
                    radius: 8,
                    damage: p.magicPower,
                    color: '#38bdf8',
                    life: 1.4
                });
            } else {
                this.addFloatingText(p.x + p.w / 2, p.y - 10, 'Mana Habis!', '#38bdf8');
            }
        }

        // Flame Nova [L / C]
        if ((this.justPressed['KeyL'] || this.justPressed['KeyC']) && p.novaCooldown <= 0) {
            if (!p.unlockNova) {
                this.showToast('Jurus Gelombang Api terbuka di Peti Runik Level 2!');
            } else if (p.mana >= 24) {
                p.mana -= 24;
                p.novaCooldown = 1.1;
                window.Sound.nova();
                this.addShake(6);
                [-1, 1].forEach((dirX) => {
                    this.projectiles.push({
                        x: p.x + p.w / 2,
                        y: p.y + p.h * 0.5,
                        vx: dirX * 420,
                        vy: 0,
                        radius: 13,
                        damage: Math.round(p.magicPower * 1.55),
                        color: '#f97316',
                        life: 0.9,
                        pierce: true
                    });
                });
                this.spawnBurst(p.x + p.w / 2, p.y + p.h / 2, '#fb923c', 16);
            } else {
                this.addFloatingText(p.x + p.w / 2, p.y - 10, 'Mana Kurang!', '#f97316');
            }
        }

        // Potion [H]
        if (this.justPressed['KeyH']) {
            if (p.potions > 0 && p.hp < p.maxHp) {
                p.potions -= 1;
                const heal = Math.min(55, p.maxHp - p.hp);
                p.hp += heal;
                window.Sound.heal();
                this.addFloatingText(p.x + p.w / 2, p.y - 10, `+${heal} HP`, '#4ade80');
                this.spawnBurst(p.x + p.w / 2, p.y + p.h / 2, '#4ade80', 12);
            }
        }

        // Interact [E / Enter]
        if (this.justPressed['KeyE'] || this.justPressed['Enter']) {
            this.tryInteract();
        }

        // Active Sword Hitbox check
        const atkBox = p.getAttackBox();
        if (atkBox) {
            // Pots
            for (const pot of this.pots) {
                if (!pot.broken && window.aabb(atkBox, pot)) {
                    this.breakPot(pot);
                }
            }
            // Switches
            for (const sw of this.switches) {
                const swBox = { x: sw.x - 16, y: sw.y - 4, w: 32, h: 36 };
                if (!sw.active && window.aabb(atkBox, swBox)) {
                    this.activateSwitch(sw);
                }
            }
            // Enemies
            for (const e of this.enemies) {
                if (!e.dead && !p.hitTargets.has(e) && window.aabb(atkBox, e)) {
                    p.hitTargets.add(e);
                    this.damageEnemy(e, p.totalAtk, p.facing * 200);
                }
            }
        }

        // Healing / Save Crystals
        for (const c of this.crystals) {
            const cBox = { x: c.x - 22, y: c.y - 10, w: 44, h: 58 };
            if (window.aabb(p, cBox) && this.crystalCooldown <= 0) {
                this.checkpoint = { x: c.x - 14, y: c.y };
                if (p.hp < p.maxHp || p.mana < p.maxMana) {
                    p.hp = p.maxHp;
                    p.mana = p.maxMana;
                    window.Sound.heal();
                    this.addFloatingText(p.x + p.w / 2, p.y - 14, 'Checkpoint & Pulih Penuh!', '#7dd3fc');
                    this.spawnBurst(c.x, c.y + 15, '#7dd3fc', 14);
                }
                this.saveGame();
                this.crystalCooldown = 2.0;
            }
        }

        // Spikes & Pitfall
        for (const sp of this.level.spikes) {
            if (window.aabb(p, sp)) {
                this.damagePlayer(18, -p.facing * 180, -340);
            }
        }
        if (p.y > this.level.height + 70) {
            this.damagePlayer(25, 0, 0);
            if (p.hp > 0) {
                p.x = this.checkpoint.x;
                p.y = this.checkpoint.y;
                p.vx = 0;
                p.vy = 0;
            }
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const pr = this.projectiles[i];
            pr.x += pr.vx * dt;
            pr.y += pr.vy * dt;
            pr.life -= dt;
            let remove = pr.life <= 0;

            const box = { x: pr.x - pr.radius, y: pr.y - pr.radius, w: pr.radius * 2, h: pr.radius * 2 };

            for (const sw of this.switches) {
                const swBox = { x: sw.x - 16, y: sw.y - 4, w: 32, h: 36 };
                if (!sw.active && window.aabb(box, swBox)) {
                    this.activateSwitch(sw);
                    if (!pr.pierce) remove = true;
                }
            }
            for (const pot of this.pots) {
                if (!pot.broken && window.aabb(box, pot)) {
                    this.breakPot(pot);
                }
            }
            for (const e of this.enemies) {
                if (!e.dead && window.aabb(box, e)) {
                    if (!pr.hitSet) pr.hitSet = new Set();
                    if (!pr.hitSet.has(e)) {
                        pr.hitSet.add(e);
                        this.damageEnemy(e, pr.damage, Math.sign(pr.vx) * 140);
                    }
                    if (!pr.pierce) {
                        remove = true;
                        break;
                    }
                }
            }

            if (remove) {
                this.spawnBurst(pr.x, pr.y, pr.color, 6);
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const ep = this.enemyProjectiles[i];
            ep.x += ep.vx * dt;
            ep.y += ep.vy * dt;
            ep.life -= dt;
            const box = { x: ep.x - ep.radius, y: ep.y - ep.radius, w: ep.radius * 2, h: ep.radius * 2 };
            if (window.aabb(box, this.player)) {
                this.damagePlayer(ep.damage, Math.sign(ep.vx) * 180, -240);
                this.enemyProjectiles.splice(i, 1);
                continue;
            }
            if (ep.life <= 0) {
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }

    spawnEnemyProjectile(x, y, vx, vy, damage, color, radius = 8, isWave = false) {
        this.enemyProjectiles.push({ x, y, vx, vy, damage, color, radius, life: isWave ? 1.8 : 2.2 });
    }

    updateEnemies(dt) {
        for (const e of this.enemies) {
            if (e.dead) continue;
            e.update(dt, this);
            if (window.aabb(this.player, e)) {
                const pushDir = (this.player.x + this.player.w / 2) < (e.x + e.w / 2) ? -1 : 1;
                this.damagePlayer(e.atk, pushDir * 220, -260);
            }
        }
    }

    damageEnemy(e, amount, knockX) {
        e.hp -= amount;
        e.hurtFlash = 0.14;
        if (!e.isBoss && !e.flying) {
            e.vx = knockX;
            e.vy = -120;
        }
        window.Sound.hit();
        this.addShake(e.isBoss ? 5 : 3);
        this.addFloatingText(e.x + e.w / 2, e.y - 6, `-${amount}`, '#fde047');
        this.spawnBurst(e.x + e.w / 2, e.y + e.h / 2, e.color, 7);

        if (e.hp <= 0) {
            e.dead = true;
            this.player.kills += 1;
            this.spawnBurst(e.x + e.w / 2, e.y + e.h / 2, '#fbbf24', e.isBoss ? 30 : 12);

            // Spawn drops
            const coinCount = e.isBoss ? 8 : 2;
            const coinVal = Math.max(2, Math.round(e.gold / coinCount));
            for (let i = 0; i < coinCount; i++) {
                this.spawnDrop(e.x + e.w / 2, e.y + e.h / 2, 'gold', coinVal);
            }
            if (Math.random() < 0.35 || e.isBoss) {
                this.spawnDrop(e.x + e.w / 2, e.y + e.h / 2, 'heart', 20);
            }
            if (Math.random() < 0.3) {
                this.spawnDrop(e.x + e.w / 2, e.y + e.h / 2, 'mana', 14);
            }

            // XP & Level up check
            this.addFloatingText(e.x + e.w / 2, e.y - 22, `+${e.xp} XP`, '#c084fc');
            if (this.player.gainXp(e.xp)) {
                this.triggerLevelUp();
            }

            if (e.isBoss) {
                if (e.type === 'malakor' && !this.victoryTriggered) {
                    this.victoryTriggered = true;
                    this.showToast('🎉 Malakor telah dikalahkan!');
                    setTimeout(() => this.showVictory(), 1100);
                } else {
                    this.showToast(`🏆 ${e.name} dikalahkan! Portal sekarang terbuka.`);
                }
            }
        }
    }

    damagePlayer(amount, knockX, knockY) {
        const p = this.player;
        if (p.invulnTimer > 0 || this.state !== 'playing') return;

        p.hp = Math.max(0, p.hp - amount);
        p.invulnTimer = 0.9;
        if (knockX !== 0) p.vx = knockX;
        if (knockY !== 0) p.vy = knockY;
        window.Sound.playerHurt();
        this.addShake(7);
        this.addFloatingText(p.x + p.w / 2, p.y - 10, `-${amount}`, '#f87171');

        if (p.hp <= 0) {
            this.setState('gameover');
        }
    }

    triggerLevelUp() {
        window.Sound.levelUp();
        document.getElementById('levelup-title').textContent = `Level ${this.player.level} Tercapai!`;
        this.setState('levelup');
    }

    applyLevelUpChoice(stat) {
        const p = this.player;
        if (stat === 'hp') {
            p.maxHp += 25;
            p.hp = p.maxHp;
            this.showToast('❤️ Max HP +25 & Darah Pulih Penuh!');
        } else if (stat === 'atk') {
            p.baseAtk += 5;
            p.hp = Math.min(p.maxHp, p.hp + 20);
            this.showToast('⚔️ Kekuatan Pedang +5!');
        } else if (stat === 'mag') {
            p.maxMana += 15;
            p.mana = p.maxMana;
            p.magicPower += 6;
            this.showToast('🔮 Max Mana +15 & Damage Sihir +6!');
        }
        this.saveGame();
        this.setState('playing');
    }

    breakPot(pot) {
        pot.broken = true;
        window.Sound.hit();
        this.spawnBurst(pot.x + 14, pot.y + 15, '#d97706', 9);
        const r = Math.random();
        if (r < 0.55) this.spawnDrop(pot.x + 14, pot.y + 10, 'gold', 6);
        else if (r < 0.8) this.spawnDrop(pot.x + 14, pot.y + 10, 'heart', 18);
        else this.spawnDrop(pot.x + 14, pot.y + 10, 'mana', 15);
    }

    activateSwitch(sw) {
        sw.active = true;
        window.Sound.switchOpen();
        this.spawnBurst(sw.x, sw.y + 12, '#4ade80', 14);
        const gate = this.gates.find((g) => g.id === sw.targetGate);
        if (gate) {
            gate.open = true;
            this.showToast('🔓 Gerbang Batu telah terbuka!');
            this.addShake(5);
        }
    }

    tryInteract() {
        const p = this.player;
        const pCenter = { x: p.x + p.w / 2, y: p.y + p.h / 2 };

        // Chests
        for (const ch of this.chests) {
            if (!ch.opened && Math.hypot(pCenter.x - (ch.x + 17), pCenter.y - (ch.y + 17)) < 58) {
                ch.opened = true;
                this.openedChests.add(ch.id);
                window.Sound.chest();
                this.spawnBurst(ch.x + 17, ch.y + 12, '#fbbf24', 18);
                const rew = ch.reward;
                const msgs = [];
                if (rew.gold) {
                    p.gold += rew.gold;
                    msgs.push(`+${rew.gold} Koin`);
                }
                if (rew.potion) {
                    p.potions += rew.potion;
                    msgs.push(`+${rew.potion} Ramuan`);
                }
                if (rew.swordId !== undefined && rew.swordId > p.swordId) {
                    p.swordId = rew.swordId;
                    msgs.push(`Senjata Baru: ${p.sword.name}`);
                }
                if (rew.unlockNova) {
                    p.unlockNova = true;
                    msgs.push('Jurus Baru: Gelombang Api [L]');
                }
                this.showToast(`💎 Peti Dibuka: ${msgs.join(' • ')}`);
                this.saveGame();
                return;
            }
        }

        // NPCs
        for (const npc of this.level.npcs) {
            if (Math.hypot(pCenter.x - (npc.x + 13), pCenter.y - (npc.y + 23)) < 68) {
                if (npc.kind === 'merchant') {
                    this.openShop();
                } else {
                    this.dialogueSpeaker = npc.name;
                    this.dialogueQueue = [...npc.lines];
                    this.setState('dialogue');
                    this.advanceDialogue();
                }
                return;
            }
        }

        // Portal
        if (this.level.portal) {
            const pt = this.level.portal;
            if (Math.hypot(pCenter.x - (pt.x + 22), pCenter.y - (pt.y + 36)) < 65) {
                const bossAlive = pt.requiresBoss && this.enemies.some((e) => e.isBoss && !e.dead);
                if (bossAlive) {
                    this.showToast('🔒 Kalahkan Boss penjaga area ini terlebih dahulu!');
                } else {
                    window.Sound.levelUp();
                    this.loadLevel(pt.nextLevel, true);
                    this.showToast(`✨ Memasuki ${this.level.name}`);
                }
            }
        }
    }

    advanceDialogue() {
        if (this.dialogueQueue.length === 0) {
            this.setState('playing');
            return;
        }
        const line = this.dialogueQueue.shift();
        document.getElementById('dialogue-speaker').textContent = this.dialogueSpeaker;
        document.getElementById('dialogue-text').textContent = line;
    }

    openShop() {
        this.renderShop();
        this.setState('shop');
    }

    renderShop() {
        document.getElementById('shop-gold').textContent = this.player.gold;
        const container = document.getElementById('shop-items');
        container.innerHTML = '';

        for (const item of window.SHOP_ITEMS) {
            const ownedSword = item.type === 'sword_2' && this.player.swordId >= 2;
            const row = document.createElement('div');
            row.className = 'shop-row';
            row.innerHTML = `
                <div class="shop-row-info">
                    <h4>${item.name}</h4>
                    <p>${item.desc}</p>
                </div>
                <button class="btn ${ownedSword ? 'btn-secondary' : 'btn-primary'}" ${ownedSword || this.player.gold < item.cost ? 'disabled' : ''}>
                    ${ownedSword ? 'Dimiliki' : `${item.cost} ●`}
                </button>
            `;
            const btn = row.querySelector('button');
            if (!ownedSword && this.player.gold >= item.cost) {
                btn.addEventListener('click', () => this.buyShopItem(item));
            } else if (this.player.gold < item.cost && !ownedSword) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
            container.appendChild(row);
        }
    }

    buyShopItem(item) {
        const p = this.player;
        if (p.gold < item.cost) return;
        p.gold -= item.cost;
        window.Sound.coin();

        if (item.type === 'consumable') p.potions += 1;
        else if (item.type === 'stat_hp') { p.maxHp += 25; p.hp += 25; }
        else if (item.type === 'stat_mana') { p.maxMana += 20; p.mana += 20; p.magicPower += 4; }
        else if (item.type === 'sword_2') { p.swordId = 2; }

        this.saveGame();
        this.renderShop();
        this.updateHud();
    }

    openLevelSelect() {
        const list = document.getElementById('level-list');
        list.innerHTML = '';
        window.WORLD_LEVELS.forEach((lvl, idx) => {
            const unlocked = idx <= this.unlockedLevel;
            const row = document.createElement('div');
            row.className = 'level-row';
            row.innerHTML = `
                <div class="level-row-info">
                    <h4>${lvl.name}</h4>
                    <p>${lvl.subtitle}</p>
                </div>
                <button class="btn ${unlocked ? 'btn-primary' : 'btn-secondary'}" ${!unlocked ? 'disabled' : ''}>
                    ${idx === this.currentLevelIdx ? 'Aktif' : unlocked ? 'Masuk' : '🔒 Terkunci'}
                </button>
            `;
            const btn = row.querySelector('button');
            if (unlocked) {
                btn.addEventListener('click', () => {
                    this.loadLevel(idx, true);
                    this.setState('playing');
                });
            } else {
                btn.style.opacity = '0.45';
            }
            list.appendChild(row);
        });
        this.setState('levels');
    }

    showVictory() {
        const mins = Math.floor(this.playTime / 60);
        const secs = Math.floor(this.playTime % 60);
        document.getElementById('victory-stats').innerHTML = `
            <div><strong>Level Hero:</strong> ${this.player.level}</div>
            <div><strong>Musuh Dikalahkan:</strong> ${this.player.kills}</div>
            <div><strong>Koin Emas:</strong> ${this.player.gold}</div>
            <div><strong>Waktu Petualangan:</strong> ${mins}m ${secs}d</div>
        `;
        window.Sound.levelUp();
        this.setState('victory');
    }

    spawnDrop(x, y, kind, value) {
        this.drops.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 140,
            vy: -210 - Math.random() * 80,
            kind,
            value,
            life: 16
        });
    }

    updateDrops(dt) {
        const p = this.player;
        const solids = this.getSolidColliders();
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.life -= dt;
            d.vy = Math.min(600, d.vy + 900 * dt);
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vx *= 0.96;

            for (const s of solids) {
                if (d.x > s.x && d.x < s.x + s.w && d.y + 6 >= s.y && d.y - 6 <= s.y + 18 && d.vy > 0) {
                    d.y = s.y - 6;
                    d.vy = 0;
                    d.vx = 0;
                }
            }

            if (Math.hypot((p.x + p.w / 2) - d.x, (p.y + p.h / 2) - d.y) < 32) {
                if (d.kind === 'gold') {
                    p.gold += d.value;
                    window.Sound.coin();
                    this.addFloatingText(d.x, d.y - 8, `+${d.value}G`, '#fbbf24');
                } else if (d.kind === 'heart') {
                    p.hp = Math.min(p.maxHp, p.hp + d.value);
                    window.Sound.heal();
                    this.addFloatingText(d.x, d.y - 8, `+${d.value} HP`, '#4ade80');
                } else if (d.kind === 'mana') {
                    p.mana = Math.min(p.maxMana, p.mana + d.value);
                    window.Sound.coin();
                    this.addFloatingText(d.x, d.y - 8, `+${d.value} MP`, '#38bdf8');
                }
                this.drops.splice(i, 1);
                continue;
            }
            if (d.life <= 0) this.drops.splice(i, 1);
        }
    }

    spawnBurst(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 160;
            this.particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 40,
                color,
                size: 2 + Math.random() * 3,
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6
            });
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 260 * dt;
            pt.life -= dt;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 32 * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    updateCamera(dt) {
        const targetX = this.player.x + this.player.w / 2 - this.canvas.width / 2;
        const targetY = this.player.y + this.player.h / 2 - this.canvas.height * 0.56;
        const maxX = Math.max(0, this.level.width - this.canvas.width);
        const maxY = Math.max(0, this.level.height - this.canvas.height);

        const clampedX = Math.max(0, Math.min(maxX, targetX));
        const clampedY = Math.max(0, Math.min(maxY, targetY));

        this.camera.x += (clampedX - this.camera.x) * Math.min(1, dt * 8);
        this.camera.y += (clampedY - this.camera.y) * Math.min(1, dt * 8);
    }

    updateInteractHint() {
        const hint = document.getElementById('interact-hint');
        const p = this.player;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        let msg = null;

        for (const ch of this.chests) {
            if (!ch.opened && Math.hypot(cx - (ch.x + 17), cy - (ch.y + 17)) < 58) {
                msg = 'Tekan [E] Buka Peti Harta';
            }
        }
        for (const npc of this.level.npcs) {
            if (Math.hypot(cx - (npc.x + 13), cy - (npc.y + 23)) < 68) {
                msg = npc.kind === 'merchant' ? `Tekan [E] Belanja (${npc.name})` : `Tekan [E] Bicara dengan ${npc.name}`;
            }
        }
        if (this.level.portal && Math.hypot(cx - (this.level.portal.x + 22), cy - (this.level.portal.y + 36)) < 65) {
            msg = 'Tekan [E] Masuk Portal ke Level Berikutnya';
        }

        if (msg) {
            hint.textContent = msg;
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }

    updateHud() {
        const p = this.player;
        document.getElementById('hud-level').textContent = `LV ${p.level}`;
        document.getElementById('hud-hp-bar').style.width = `${(p.hp / p.maxHp) * 100}%`;
        document.getElementById('hud-hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
        document.getElementById('hud-mana-bar').style.width = `${(p.mana / p.maxMana) * 100}%`;
        document.getElementById('hud-mana-text').textContent = `${Math.floor(p.mana)} / ${p.maxMana}`;
        document.getElementById('hud-gold').textContent = p.gold;
        document.getElementById('hud-sword').textContent = `⚔ ${p.sword.name}`;
        document.getElementById('hud-xp-bar').style.width = `${(p.xp / p.xpNeeded) * 100}%`;
        document.getElementById('hud-xp-text').textContent = `${p.xp} / ${p.xpNeeded}`;
        document.getElementById('potion-count').textContent = `Ramuan (${p.potions})`;

        document.getElementById('slot-nova').classList.toggle('locked', !p.unlockNova);
        document.getElementById('slot-magic').classList.toggle('cooldown', p.magicCooldown > 0 || p.mana < 12);
        document.getElementById('slot-nova').classList.toggle('cooldown', p.unlockNova && (p.novaCooldown > 0 || p.mana < 24));

        const activeBoss = this.enemies.find((e) => e.isBoss && !e.dead && e.bossActivated);
        const bossHud = document.getElementById('boss-hud');
        if (activeBoss) {
            bossHud.classList.remove('hidden');
            document.getElementById('boss-name').textContent = activeBoss.name;
            document.getElementById('boss-hp-bar').style.width = `${Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100)}%`;
        } else {
            bossHud.classList.add('hidden');
        }
    }

    showToast(text) {
        const box = document.getElementById('toast-box');
        box.textContent = text;
        box.classList.remove('hidden');
        this.toastTimer = 3.6;
    }

    addShake(amount) {
        this.shake = Math.min(14, Math.max(this.shake, amount));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new AdventureGame();
});
