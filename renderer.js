/**
 * Canvas 2D Renderer with biome parallax, dynamic sprites, sword arcs & lighting.
 */
window.THEMES = {
    forest: {
        skyTop: '#1e3a5f',
        skyBottom: '#60a5fa',
        mountain1: '#1e4d45',
        mountain2: '#143632',
        groundTop: '#22c55e',
        groundBody: '#5c3a21',
        stone: '#64748b'
    },
    cavern: {
        skyTop: '#090d1f',
        skyBottom: '#1e1b4b',
        mountain1: '#1e293b',
        mountain2: '#0f172a',
        groundTop: '#38bdf8',
        groundBody: '#1e293b',
        stone: '#475569'
    },
    ruins: {
        skyTop: '#1f1024',
        skyBottom: '#581c4c',
        mountain1: '#3b1d36',
        mountain2: '#241122',
        groundTop: '#a855f7',
        groundBody: '#33293a',
        stone: '#52525b'
    },
    sanctum: {
        skyTop: '#14050a',
        skyBottom: '#450a1a',
        mountain1: '#2d0812',
        mountain2: '#1a040a',
        groundTop: '#f43f5e',
        groundBody: '#1f1218',
        stone: '#3f2e36'
    }
};

window.GameRenderer = class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    render(game) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const theme = window.THEMES[game.level.theme] || window.THEMES.forest;

        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, theme.skyTop);
        grad.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Parallax backdrop
        this.drawParallax(ctx, W, H, game.camera.x, game.level.theme, theme, game.time);

        ctx.save();
        const sx = (Math.random() - 0.5) * game.shake;
        const sy = (Math.random() - 0.5) * game.shake;
        ctx.translate(-Math.round(game.camera.x + sx), -Math.round(game.camera.y + sy));

        // Platforms & Moving Platforms
        for (const p of game.level.platforms) {
            this.drawPlatform(ctx, p, theme);
        }
        for (const mp of game.movingPlatforms) {
            this.drawPlatform(ctx, { x: mp.x, y: mp.y, w: mp.w, h: mp.h, kind: 'stone' }, theme, true);
        }

        // Spikes
        for (const sp of game.level.spikes) {
            this.drawSpikes(ctx, sp);
        }

        // Gates & Switches
        for (const g of game.gates) {
            if (!g.open) this.drawGate(ctx, g);
        }
        for (const sw of game.switches) {
            this.drawSwitch(ctx, sw, game.time);
        }

        // Save/Heal Crystals
        for (const c of game.crystals) {
            this.drawCrystal(ctx, c, game.time);
        }

        // Portal
        if (game.level.portal) {
            const locked = game.level.portal.requiresBoss && game.enemies.some(e => e.isBoss && !e.dead);
            this.drawPortal(ctx, game.level.portal, locked, game.time);
        }

        // Pots & Chests
        for (const pot of game.pots) {
            if (!pot.broken) this.drawPot(ctx, pot);
        }
        for (const ch of game.chests) {
            this.drawChest(ctx, ch);
        }

        // NPCs
        for (const npc of game.level.npcs) {
            this.drawNPC(ctx, npc, game.time);
        }

        // Drops
        for (const d of game.drops) {
            this.drawDrop(ctx, d, game.time);
        }

        // Enemies
        for (const e of game.enemies) {
            if (!e.dead) this.drawEnemy(ctx, e);
        }

        // Player
        this.drawPlayer(ctx, game.player);

        // Projectiles
        for (const proj of game.projectiles) {
            this.drawProjectile(ctx, proj);
        }
        for (const ep of game.enemyProjectiles) {
            this.drawProjectile(ctx, ep);
        }

        // Particles & Floating Texts
        for (const pt of game.particles) {
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const ft of game.floatingTexts) {
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.font = 'bold 14px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000';
            ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    drawParallax(ctx, W, H, camX, themeName, theme, time) {
        // Stars / Moon / Glow orbs
        ctx.fillStyle = themeName === 'forest' ? 'rgba(254, 240, 138, 0.85)' : 'rgba(248, 250, 252, 0.7)';
        if (themeName === 'forest') {
            ctx.beginPath();
            ctx.arc(W - 140, 95, 36, 0, Math.PI * 2);
            ctx.fill();
        } else {
            for (let i = 0; i < 28; i++) {
                const sx = ((i * 173 - camX * 0.08) % W + W) % W;
                const sy = (i * 67) % (H * 0.55);
                const r = (i % 3) + 1;
                ctx.globalAlpha = 0.35 + Math.sin(time * 2 + i) * 0.25;
                ctx.fillRect(sx, sy, r, r);
            }
            ctx.globalAlpha = 1;
        }

        // Distant Mountains Layer 1
        ctx.fillStyle = theme.mountain1;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + 120; x += 120) {
            const worldIdx = Math.floor((x + camX * 0.2) / 120);
            const px = x - ((camX * 0.2) % 120);
            const peak = 230 + Math.abs(Math.sin(worldIdx * 1.7)) * 120;
            ctx.lineTo(px, H - peak);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();

        // Closer Hills/Ruins Layer 2
        ctx.fillStyle = theme.mountain2;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + 90; x += 90) {
            const worldIdx = Math.floor((x + camX * 0.4) / 90);
            const px = x - ((camX * 0.4) % 90);
            const peak = 130 + Math.abs(Math.cos(worldIdx * 2.1)) * 85;
            ctx.lineTo(px, H - peak);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
    }

    drawPlatform(ctx, p, theme, isMoving = false) {
        if (p.kind === 'ground') {
            ctx.fillStyle = theme.groundBody;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = theme.groundTop;
            ctx.fillRect(p.x, p.y, p.w, 10);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            for (let x = p.x + 12; x < p.x + p.w - 16; x += 48) {
                ctx.fillRect(x, p.y + 22, 20, 8);
            }
        } else if (p.kind === 'thin') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(p.x, p.y, p.w, 6);
        } else {
            ctx.fillStyle = isMoving ? '#0e7490' : theme.stone;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.strokeStyle = isMoving ? '#67e8f9' : 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
        }
    }

    drawSpikes(ctx, sp) {
        ctx.fillStyle = '#94a3b8';
        const step = 16;
        for (let x = sp.x; x < sp.x + sp.w - 4; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, sp.y + sp.h);
            ctx.lineTo(x + step / 2, sp.y);
            ctx.lineTo(x + step, sp.y + sp.h);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawGate(ctx, g) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(g.x, g.y, g.w, g.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(g.x + 2, g.y + 2, g.w - 4, g.h - 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(g.x + g.w / 2 - 3, g.y + 14, 6, g.h - 28);
    }

    drawSwitch(ctx, sw, time) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sw.x - 14, sw.y + 22, 28, 12);
        const pulse = Math.sin(time * 5) * 2;
        ctx.fillStyle = sw.active ? '#22c55e' : '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(sw.x, sw.y - pulse);
        ctx.lineTo(sw.x + 11, sw.y + 12);
        ctx.lineTo(sw.x, sw.y + 24);
        ctx.lineTo(sw.x - 11, sw.y + 12);
        ctx.closePath();
        ctx.fill();
    }

    drawCrystal(ctx, c, time) {
        const hover = Math.sin(time * 3) * 4;
        ctx.fillStyle = '#475569';
        ctx.fillRect(c.x - 16, c.y + 34, 32, 14);

        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 6 + hover);
        ctx.lineTo(c.x + 13, c.y + 14 + hover);
        ctx.lineTo(c.x, c.y + 32 + hover);
        ctx.lineTo(c.x - 13, c.y + 14 + hover);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawPortal(ctx, portal, locked, time) {
        ctx.save();
        ctx.translate(portal.x + 22, portal.y + 36);
        ctx.strokeStyle = locked ? '#64748b' : '#a855f7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 34, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (!locked) {
            ctx.fillStyle = `rgba(168, 85, 247, ${0.35 + Math.sin(time * 5) * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, 17, 29, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawPot(ctx, pot) {
        if (pot.kind === 'crate') {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(pot.x, pot.y, 28, 30);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.strokeRect(pot.x + 1, pot.y + 1, 26, 28);
            ctx.beginPath();
            ctx.moveTo(pot.x, pot.y);
            ctx.lineTo(pot.x + 28, pot.y + 30);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.ellipse(pot.x + 13, pot.y + 18, 12, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#78350f';
            ctx.fillRect(pot.x + 6, pot.y + 2, 14, 6);
        }
    }

    drawChest(ctx, ch) {
        ctx.fillStyle = ch.opened ? '#78350f' : '#b45309';
        ctx.fillRect(ch.x, ch.y + 8, 34, 26);
        ctx.fillStyle = ch.opened ? '#92400e' : '#fbbf24';
        ctx.fillRect(ch.x - 2, ch.y, 38, 12);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(ch.x + 14, ch.y + 10, 6, 8);
    }

    drawNPC(ctx, npc, time) {
        const bob = Math.sin(time * 2.5) * 1.5;
        ctx.fillStyle = npc.kind === 'merchant' ? '#f59e0b' : '#3b82f6';
        ctx.fillRect(npc.x, npc.y + 14 + bob, 26, 32);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(npc.x + 13, npc.y + 8 + bob, 9, 0, Math.PI * 2);
        ctx.fill();

        // Nameplate
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(npc.name, npc.x + 13, npc.y - 8);
    }

    drawDrop(ctx, d, time) {
        const bob = Math.sin(time * 6 + d.x) * 3;
        if (d.kind === 'gold') {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(d.x, d.y + bob, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else if (d.kind === 'heart') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(d.x - 3, d.y + bob, 4, 0, Math.PI * 2);
            ctx.arc(d.x + 3, d.y + bob, 4, 0, Math.PI * 2);
            ctx.lineTo(d.x, d.y + 7 + bob);
            ctx.fill();
        } else if (d.kind === 'mana') {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(d.x, d.y - 7 + bob);
            ctx.lineTo(d.x + 5, d.y + bob);
            ctx.lineTo(d.x, d.y + 7 + bob);
            ctx.lineTo(d.x - 5, d.y + bob);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawPlayer(ctx, p) {
        if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0) return;

        ctx.save();
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        const walkBob = p.onGround && Math.abs(p.vx) > 15 ? Math.sin(p.animTime * 16) * 2.5 : 0;

        // Flowing Hero Cape (Swordigo signature blue/red hero silhouette!)
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(cx - p.facing * 4, p.y + 14);
        ctx.lineTo(cx - p.facing * (18 + Math.abs(p.vx) * 0.03), p.y + 34 + walkBob);
        ctx.lineTo(cx - p.facing * 3, p.y + 38);
        ctx.closePath();
        ctx.fill();

        // Tunic / Body
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(p.x + 4, p.y + 14 + walkBob, p.w - 8, 22);

        // Legs
        ctx.fillStyle = '#1e293b';
        const stride = p.onGround && Math.abs(p.vx) > 15 ? Math.sin(p.animTime * 16) * 5 : 0;
        ctx.fillRect(p.x + 6 + stride, p.y + 35, 6, 9);
        ctx.fillRect(p.x + p.w - 12 - stride, p.y + 35, 6, 9);

        // Head & Hair
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(cx, p.y + 9 + walkBob, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx - p.facing * 2, p.y + 6 + walkBob, 9, Math.PI, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + p.facing * 3, p.y + 7 + walkBob, 3, 3);

        // Sword Swing & Slash Arc
        const sword = p.sword;
        if (p.attackTimer > 0) {
            const progress = 1 - p.attackTimer / 0.18;
            const arcAngle = p.comboStep === 2
                ? (0.9 - progress * 2.1)
                : (-1.1 + progress * 2.2);

            ctx.save();
            ctx.translate(cx + p.facing * 6, cy + 2);
            ctx.scale(p.facing, 1);
            ctx.rotate(arcAngle);

            if (sword.glow) {
                ctx.shadowColor = sword.glow;
                ctx.shadowBlur = 12;
            }
            ctx.fillStyle = sword.color;
            ctx.fillRect(0, -3, sword.length, 6);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-4, -6, 6, 12);
            ctx.restore();

            // Sweeping Slash Trail
            ctx.save();
            ctx.strokeStyle = sword.glow || '#e2e8f0';
            ctx.globalAlpha = Math.max(0.2, p.attackTimer / 0.18);
            ctx.lineWidth = p.comboStep === 3 ? 8 : 5;
            ctx.beginPath();
            if (p.facing === 1) {
                ctx.arc(cx + 4, cy, sword.length + 2, -0.9, 0.9);
            } else {
                ctx.arc(cx - 4, cy, sword.length + 2, Math.PI - 0.9, Math.PI + 0.9);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            // Sheathed / Ready sword at side
            ctx.fillStyle = sword.color;
            ctx.fillRect(cx + p.facing * 8, p.y + 18 + walkBob, p.facing * 16, 4);
        }

        ctx.restore();
    }

    drawEnemy(ctx, e) {
        ctx.save();
        const flash = e.hurtFlash > 0;
        ctx.fillStyle = flash ? '#ffffff' : e.color;

        if (e.type === 'slime') {
            const squish = e.onGround ? Math.sin(e.animTime * 6) * 2 : -3;
            ctx.beginPath();
            ctx.ellipse(e.x + e.w / 2, e.y + e.h - 10, e.w / 2 + squish, e.h / 2 - squish * 0.5, 0, Math.PI, Math.PI * 2);
            ctx.lineTo(e.x + e.w, e.y + e.h);
            ctx.lineTo(e.x, e.y + e.h);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(e.x + (e.facing === 1 ? 16 : 6), e.y + 9, 4, 4);
            ctx.fillRect(e.x + (e.facing === 1 ? 22 : 12), e.y + 9, 4, 4);
        } else if (e.type === 'bat') {
            const flap = Math.sin(e.animTime * 18) * 7;
            ctx.beginPath();
            ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
            ctx.lineTo(e.x - 8, e.y + 4 + flap);
            ctx.lineTo(e.x + 4, e.y + e.h);
            ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
            ctx.lineTo(e.x + e.w + 8, e.y + 4 + flap);
            ctx.lineTo(e.x + e.w - 4, e.y + e.h);
            ctx.fill();
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(e.x + e.w / 2 - 4, e.y + 8, 3, 3);
            ctx.fillRect(e.x + e.w / 2 + 2, e.y + 8, 3, 3);
        } else {
            // Humanoid / Boss body
            ctx.fillRect(e.x + 2, e.y + 14, e.w - 4, e.h - 14);
            ctx.beginPath();
            ctx.arc(e.x + e.w / 2, e.y + 11, e.w * 0.34, 0, Math.PI * 2);
            ctx.fill();

            // Horns / Crown for bosses & knights
            if (e.isBoss || e.type === 'knight') {
                ctx.fillStyle = e.type === 'malakor' ? '#fbbf24' : '#cbd5e1';
                ctx.fillRect(e.x + 4, e.y - 4, 5, 10);
                ctx.fillRect(e.x + e.w - 9, e.y - 4, 5, 10);
            }

            // Glowing Eyes
            ctx.fillStyle = e.type === 'skeleton' ? '#0f172a' : '#fef08a';
            const eyeX = e.x + e.w / 2 + e.facing * 4;
            ctx.fillRect(eyeX - 3, e.y + 8, 4, 4);
            ctx.fillRect(eyeX + 3, e.y + 8, 4, 4);

            // Weapon
            ctx.fillStyle = e.type === 'mage' ? '#a855f7' : '#e2e8f0';
            ctx.fillRect(e.x + e.w / 2 + e.facing * 12, e.y + 20, e.facing * (e.isBoss ? 26 : 16), 5);
        }

        // Enemy Mini HP bar (non-bosses when damaged)
        if (!e.isBoss && e.hp < e.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(e.x, e.y - 10, e.w, 5);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(e.x, e.y - 10, e.w * (e.hp / e.maxHp), 5);
        }

        ctx.restore();
    }

    drawProjectile(ctx, proj) {
        ctx.save();
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};
