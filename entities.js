/**
 * Core entities: Player, Enemies (including Bosses), Projectiles, Drops, Particles.
 */
window.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

window.ENEMY_TEMPLATES = {
    slime:    { w: 30, h: 24, hp: 32,  atk: 10, speed: 75,  xp: 18, gold: 6,  color: '#22c55e', name: 'Slime Hijau' },
    bat:      { w: 28, h: 22, hp: 26,  atk: 12, speed: 125, xp: 20, gold: 8,  color: '#a855f7', name: 'Kelelawar Gua', flying: true },
    goblin:   { w: 28, h: 40, hp: 52,  atk: 15, speed: 135, xp: 30, gold: 12, color: '#84cc16', name: 'Goblin Pengintai' },
    skeleton: { w: 30, h: 44, hp: 72,  atk: 18, speed: 105, xp: 40, gold: 16, color: '#e2e8f0', name: 'Tengkorak Ksatria' },
    mage:     { w: 28, h: 44, hp: 62,  atk: 20, speed: 85,  xp: 48, gold: 20, color: '#c084fc', name: 'Penyihir Bayangan' },
    knight:   { w: 34, h: 48, hp: 115, atk: 24, speed: 115, xp: 65, gold: 28, color: '#64748b', name: 'Ksatria Kegelapan' },
    warchief: { w: 50, h: 62, hp: 260, atk: 22, speed: 125, xp: 140, gold: 75, color: '#65a30d', name: 'Kepala Goblin Kraag' },
    golem:    { w: 54, h: 68, hp: 380, atk: 26, speed: 95,  xp: 200, gold: 100, color: '#06b6d4', name: 'Golem Kristal Purba' },
    malakor:  { w: 52, h: 72, hp: 720, atk: 30, speed: 155, xp: 500, gold: 250, color: '#e11d48', name: 'Malakor, Raja Kegelapan' }
};

window.Player = class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 28;
        this.h = 44;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;

        this.onGround = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.jumpsLeft = 2;
        this.dropThroughTimer = 0;

        // RPG Stats
        this.level = 1;
        this.xp = 0;
        this.xpNeeded = 60;
        this.maxHp = 100;
        this.hp = 100;
        this.maxMana = 50;
        this.mana = 50;
        this.baseAtk = 16;
        this.magicPower = 22;
        this.swordId = 0;
        this.gold = 0;
        this.potions = 1;
        this.unlockNova = false;

        // Combat & timers
        this.invulnTimer = 0;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.comboStep = 0;
        this.comboResetTimer = 0;
        this.hitTargets = new Set();
        this.magicCooldown = 0;
        this.novaCooldown = 0;
        this.animTime = 0;
        this.kills = 0;
    }

    get sword() {
        return window.SWORDS[this.swordId] || window.SWORDS[0];
    }

    get totalAtk() {
        const comboMult = this.comboStep === 3 ? 1.4 : this.comboStep === 2 ? 1.15 : 1.0;
        return Math.round((this.baseAtk + this.sword.bonusAtk) * comboMult);
    }

    serialize() {
        return {
            level: this.level,
            xp: this.xp,
            xpNeeded: this.xpNeeded,
            maxHp: this.maxHp,
            hp: this.hp,
            maxMana: this.maxMana,
            mana: this.mana,
            baseAtk: this.baseAtk,
            magicPower: this.magicPower,
            swordId: this.swordId,
            gold: this.gold,
            potions: this.potions,
            unlockNova: this.unlockNova,
            kills: this.kills
        };
    }

    applySave(data) {
        if (!data) return;
        Object.assign(this, data);
        this.hp = Math.min(this.maxHp, Math.max(1, this.hp));
        this.mana = Math.min(this.maxMana, Math.max(0, this.mana));
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpNeeded) {
            this.xp -= this.xpNeeded;
            this.level += 1;
            this.xpNeeded = Math.floor(60 * Math.pow(1.38, this.level - 1));
            return true;
        }
        return false;
    }

    getAttackBox() {
        if (this.attackTimer <= 0) return null;
        const reach = this.sword.length + (this.comboStep === 3 ? 12 : 0);
        return {
            x: this.facing === 1 ? this.x + this.w - 4 : this.x - reach + 4,
            y: this.y - 4,
            w: reach,
            h: this.h + 6
        };
    }
};

window.Enemy = class Enemy {
    constructor(spawn) {
        const tpl = window.ENEMY_TEMPLATES[spawn.type];
        this.type = spawn.type;
        this.name = spawn.bossName || tpl.name;
        this.isBoss = !!spawn.isBoss;
        this.flying = !!tpl.flying;

        this.x = spawn.x;
        this.y = spawn.y;
        this.homeX = spawn.x;
        this.homeY = spawn.y;
        this.w = tpl.w;
        this.h = tpl.h;
        this.vx = 0;
        this.vy = 0;
        this.facing = -1;

        this.maxHp = tpl.hp;
        this.hp = tpl.hp;
        this.atk = tpl.atk;
        this.speed = tpl.speed;
        this.xp = tpl.xp;
        this.gold = tpl.gold;
        this.color = tpl.color;

        this.onGround = false;
        this.aiTimer = Math.random() * 1.5;
        this.attackCooldown = 0.8;
        this.hurtFlash = 0;
        this.bossActivated = false;
        this.bossState = 'idle';
        this.bossStateTimer = 1.0;
        this.dead = false;
        this.animTime = Math.random() * 5;
    }

    update(dt, game) {
        if (this.dead) return;
        this.animTime += dt;
        if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt);
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        const p = game.player;
        const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
        const dy = (p.y + p.h / 2) - (this.y + this.h / 2);
        const dist = Math.hypot(dx, dy);

        if (this.isBoss && !this.bossActivated) {
            if (dist < 560) {
                this.bossActivated = true;
                window.Sound.bossRoar();
                game.showToast(`⚠️ ${this.name} menghadang jalanmu!`);
            } else {
                this.vx = 0;
                this.applyPhysics(dt, game);
                return;
            }
        }

        switch (this.type) {
            case 'slime':
                this.updateSlime(dt, dx, dist);
                break;
            case 'bat':
                this.updateBat(dt, dx, dy, dist);
                break;
            case 'goblin':
            case 'skeleton':
            case 'knight':
                this.updateMeleeFighter(dt, dx, dist);
                break;
            case 'mage':
                this.updateMage(dt, dx, dy, dist, game);
                break;
            case 'warchief':
            case 'golem':
            case 'malakor':
                this.updateBoss(dt, dx, dy, dist, game);
                break;
        }

        if (!this.flying) {
            this.applyPhysics(dt, game);
        } else {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }
    }

    updateSlime(dt, dx, dist) {
        this.aiTimer -= dt;
        if (this.onGround) {
            this.vx *= 0.8;
            if (this.aiTimer <= 0) {
                const dir = dist < 320 ? Math.sign(dx) || 1 : (this.x > this.homeX + 80 ? -1 : this.x < this.homeX - 80 ? 1 : this.facing);
                this.facing = dir;
                this.vx = dir * (dist < 320 ? this.speed * 1.45 : this.speed);
                this.vy = -310;
                this.aiTimer = 1.0 + Math.random() * 0.7;
            }
        }
    }

    updateBat(dt, dx, dy, dist) {
        if (dist < 380) {
            const angle = Math.atan2(dy, dx);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed + Math.sin(this.animTime * 8) * 35;
            this.facing = dx >= 0 ? 1 : -1;
        } else {
            this.vx = Math.cos(this.animTime * 1.4) * 55;
            this.vy = Math.sin(this.animTime * 3) * 30;
            this.facing = this.vx >= 0 ? 1 : -1;
        }
    }

    updateMeleeFighter(dt, dx, dist) {
        const aggroRange = this.type === 'knight' ? 420 : 340;
        if (dist < aggroRange) {
            this.facing = dx >= 0 ? 1 : -1;
            const rushMult = this.type === 'goblin' ? 1.2 : 1.0;
            if (Math.abs(dx) > 18) {
                this.vx = this.facing * this.speed * rushMult;
            } else {
                this.vx = 0;
            }
            // Knight occasional lunge
            if (this.type === 'knight' && this.onGround && this.attackCooldown <= 0 && Math.abs(dx) < 170) {
                this.vx = this.facing * 290;
                this.vy = -210;
                this.attackCooldown = 2.1;
            }
        } else {
            this.aiTimer -= dt;
            if (this.aiTimer <= 0) {
                this.facing = this.x > this.homeX + 90 ? -1 : this.x < this.homeX - 90 ? 1 : -this.facing;
                this.aiTimer = 1.8 + Math.random();
            }
            this.vx = this.facing * this.speed * 0.5;
        }
    }

    updateMage(dt, dx, dy, dist, game) {
        if (dist < 460) {
            this.facing = dx >= 0 ? 1 : -1;
            if (Math.abs(dx) < 140) {
                this.vx = -this.facing * this.speed;
            } else if (Math.abs(dx) > 270) {
                this.vx = this.facing * this.speed;
            } else {
                this.vx = 0;
            }
            if (this.attackCooldown <= 0) {
                const angle = Math.atan2(dy, dx);
                game.spawnEnemyProjectile(
                    this.x + this.w / 2,
                    this.y + this.h * 0.4,
                    Math.cos(angle) * 265,
                    Math.sin(angle) * 265,
                    this.atk,
                    '#c084fc',
                    8
                );
                this.attackCooldown = 2.0;
            }
        } else {
            this.vx = 0;
        }
    }

    updateBoss(dt, dx, dy, dist, game) {
        const enraged = this.hp < this.maxHp * 0.5;
        const speedMult = enraged ? 1.28 : 1.0;
        this.bossStateTimer -= dt;

        if (this.bossState === 'idle') {
            this.facing = dx >= 0 ? 1 : -1;
            this.vx = this.facing * this.speed * 0.65 * speedMult;
            if (this.bossStateTimer <= 0) {
                const roll = Math.random();
                if (this.type === 'malakor') {
                    this.bossState = roll < 0.36 ? 'dash' : roll < 0.72 ? 'volley' : 'slam';
                } else if (this.type === 'golem') {
                    this.bossState = roll < 0.5 ? 'slam' : 'volley';
                } else {
                    this.bossState = roll < 0.55 ? 'dash' : 'slam';
                }
                this.bossStateTimer = this.bossState === 'dash' ? 0.55 : 0.7;

                if (this.bossState === 'slam' && this.onGround) {
                    this.vy = -480;
                    this.vx = this.facing * 200;
                } else if (this.bossState === 'volley') {
                    this.vx = 0;
                    const baseAngle = Math.atan2(dy, dx);
                    const count = this.type === 'malakor' ? (enraged ? 5 : 3) : 3;
                    for (let i = 0; i < count; i++) {
                        const offset = (i - (count - 1) / 2) * 0.24;
                        const spd = this.type === 'malakor' ? 300 : 250;
                        game.spawnEnemyProjectile(
                            this.x + this.w / 2,
                            this.y + this.h * 0.4,
                            Math.cos(baseAngle + offset) * spd,
                            Math.sin(baseAngle + offset) * spd,
                            Math.round(this.atk * 0.85),
                            this.type === 'malakor' ? '#fb7185' : '#22d3ee',
                            9
                        );
                    }
                }
            }
        } else if (this.bossState === 'dash') {
            this.vx = this.facing * this.speed * 2.5 * speedMult;
            if (this.bossStateTimer <= 0) {
                this.bossState = 'idle';
                this.bossStateTimer = enraged ? 0.85 : 1.25;
            }
        } else if (this.bossState === 'volley') {
            this.vx = 0;
            if (this.bossStateTimer <= 0) {
                this.bossState = 'idle';
                this.bossStateTimer = enraged ? 0.9 : 1.3;
            }
        } else if (this.bossState === 'slam') {
            if (this.onGround && this.vy >= 0 && this.bossStateTimer < 0.5) {
                // Ground shockwave left & right!
                game.addShake(8);
                window.Sound.hit();
                const waveColor = this.type === 'malakor' ? '#f43f5e' : this.type === 'golem' ? '#22d3ee' : '#a3e635';
                game.spawnEnemyProjectile(this.x + this.w / 2, this.y + this.h - 12, -260, 0, Math.round(this.atk * 0.8), waveColor, 10, true);
                game.spawnEnemyProjectile(this.x + this.w / 2, this.y + this.h - 12, 260, 0, Math.round(this.atk * 0.8), waveColor, 10, true);
                this.bossState = 'idle';
                this.bossStateTimer = enraged ? 0.95 : 1.35;
            }
        }
    }

    applyPhysics(dt, game) {
        this.vy = Math.min(900, this.vy + 1500 * dt);

        this.x += this.vx * dt;
        const solids = game.getSolidColliders();
        for (const s of solids) {
            if (s.kind === 'thin') continue;
            if (window.aabb(this, s)) {
                if (this.vx > 0) this.x = s.x - this.w;
                else if (this.vx < 0) this.x = s.x + s.w;
                this.vx = 0;
            }
        }

        // Keep boss inside arena bounds
        if (this.isBoss) {
            this.x = Math.max(game.level.width - 1220, Math.min(game.level.width - this.w - 30, this.x));
        } else {
            this.x = Math.max(10, Math.min(game.level.width - this.w - 10, this.x));
        }

        const prevBottom = this.y + this.h;
        this.y += this.vy * dt;
        this.onGround = false;

        for (const s of solids) {
            if (s.kind === 'thin') {
                if (this.vy >= 0 && prevBottom <= s.y + 8 && window.aabb(this, s)) {
                    this.y = s.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                }
            } else if (window.aabb(this, s)) {
                if (this.vy > 0) {
                    this.y = s.y - this.h;
                    this.vy = 0;
                    this.onGround = true;
                } else if (this.vy < 0) {
                    this.y = s.y + s.h;
                    this.vy = 0;
                }
            }
        }
    }
};
