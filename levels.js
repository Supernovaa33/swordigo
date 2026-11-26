/**
 * Sword upgrades and Shop catalog + 4 hand-crafted Swordigo-inspired levels.
 */
window.SWORDS = [
    { id: 0, name: 'Pedang Perunggu', bonusAtk: 0, color: '#cbd5e1', edgeColor: '#f8fafc', glow: null, length: 42 },
    { id: 1, name: 'Pedang Besi Runik', bonusAtk: 9, color: '#38bdf8', edgeColor: '#e0f2fe', glow: '#0ea5e9', length: 48 },
    { id: 2, name: 'Pedang Api Fajar', bonusAtk: 19, color: '#f97316', edgeColor: '#fef08a', glow: '#ef4444', length: 54 }
];

window.SHOP_ITEMS = [
    {
        id: 'potion',
        name: 'Ramuan Penyembuh',
        desc: 'Memulihkan 55 HP saat ditekan tombol H.',
        cost: 20,
        type: 'consumable'
    },
    {
        id: 'heart_container',
        name: 'Wadah Hati Kuno',
        desc: 'Menambah +25 Max HP secara permanen.',
        cost: 55,
        type: 'stat_hp'
    },
    {
        id: 'mana_crystal',
        name: 'Kristal Mana Murni',
        desc: 'Menambah +20 Max Mana & +4 Damage Sihir.',
        cost: 50,
        type: 'stat_mana'
    },
    {
        id: 'flame_sword',
        name: 'Pedang Api Fajar (Lv.3)',
        desc: 'Senjata legendaris! +19 Bonus ATK & jangkauan tebasan lebih panjang.',
        cost: 120,
        type: 'sword_2'
    }
];

window.WORLD_LEVELS = [
    // =========================================================================
    // LEVEL 1: LEMBAH HIJAU (GREENWOOD VALLEY)
    // =========================================================================
    {
        id: 0,
        name: 'Level 1: Lembah Hijau',
        subtitle: 'Awal Petualangan',
        theme: 'forest',
        width: 3250,
        height: 700,
        spawn: { x: 90, y: 490 },
        platforms: [
            // Main ground segments
            { x: 0, y: 560, w: 1350, h: 160, kind: 'ground' },
            { x: 1440, y: 560, w: 1810, h: 160, kind: 'ground' },
            // Gentle platforms & secret ledges
            { x: 380, y: 465, w: 140, h: 20, kind: 'thin' },
            { x: 580, y: 395, w: 150, h: 20, kind: 'thin' },
            { x: 820, y: 455, w: 160, h: 20, kind: 'thin' },
            { x: 1020, y: 360, w: 170, h: 22, kind: 'stone' }, // Secret chest ledge
            // Gap bridge
            { x: 1330, y: 495, w: 120, h: 20, kind: 'thin' },
            // Mid-zone platforms
            { x: 1680, y: 465, w: 150, h: 20, kind: 'thin' },
            { x: 1900, y: 390, w: 160, h: 20, kind: 'thin' },
            { x: 2100, y: 330, w: 150, h: 22, kind: 'stone' }, // Switch ledge
            // Arena wall ledge
            { x: 2560, y: 450, w: 130, h: 20, kind: 'thin' },
            { x: 2870, y: 450, w: 130, h: 20, kind: 'thin' }
        ],
        movingPlatforms: [],
        spikes: [
            { x: 1350, y: 635, w: 90, h: 25 }
        ],
        gates: [
            { id: 'gate1', x: 2360, y: 410, w: 28, h: 150, open: false }
        ],
        switches: [
            { id: 'sw1', x: 2165, y: 295, targetGate: 'gate1', active: false }
        ],
        crystals: [
            { x: 1520, y: 512 }
        ],
        npcs: [
            {
                id: 'elder',
                name: 'Tetua Eldrin',
                x: 185,
                y: 514,
                kind: 'elder',
                lines: [
                    'Selamat datang, Ksatria Muda! Kegelapan Malakor mulai menyebar ke Lembah Hijau.',
                    'Gunakan [J] untuk menebas musuh, [K] untuk menembakkan Bola Sihir, dan [Spasi] 2x untuk Lompat Ganda!',
                    'Hancurkan guci untuk mencari koin dan hati. Untuk membuka gerbang batu di ujung lembah, pukul Kristal Saklar dengan pedang atau sihir!'
                ]
            },
            {
                id: 'merchant1',
                name: 'Pedagang Keliling',
                x: 1595,
                y: 514,
                kind: 'merchant'
            }
        ],
        pots: [
            { x: 320, y: 530, kind: 'pot' },
            { x: 430, y: 435, kind: 'pot' },
            { x: 640, y: 365, kind: 'crate' },
            { x: 1210, y: 530, kind: 'pot' },
            { x: 1740, y: 435, kind: 'crate' },
            { x: 2450, y: 530, kind: 'pot' }
        ],
        chests: [
            { id: 'l1_c1', x: 1085, y: 326, reward: { gold: 35, potion: 1 }, opened: false },
            { id: 'l1_c2', x: 1960, y: 356, reward: { gold: 25 }, opened: false }
        ],
        enemies: [
            { type: 'slime', x: 490, y: 520 },
            { type: 'slime', x: 760, y: 520 },
            { type: 'bat', x: 920, y: 340 },
            { type: 'goblin', x: 1120, y: 510 },
            { type: 'slime', x: 1730, y: 520 },
            { type: 'bat', x: 1950, y: 300 },
            { type: 'goblin', x: 2080, y: 510 },
            { type: 'goblin', x: 2250, y: 510 },
            { type: 'warchief', x: 2770, y: 490, isBoss: true, bossName: 'Kepala Goblin Kraag' }
        ],
        portal: { x: 3110, y: 486, nextLevel: 1, requiresBoss: true }
    },

    // =========================================================================
    // LEVEL 2: GUA KRISTAL GELAP (SHADOW CRYSTAL CAVERNS)
    // =========================================================================
    {
        id: 1,
        name: 'Level 2: Gua Kristal Gelap',
        subtitle: 'Kedalaman Bawah Tanah',
        theme: 'cavern',
        width: 3450,
        height: 760,
        spawn: { x: 80, y: 530 },
        platforms: [
            { x: 0, y: 600, w: 720, h: 160, kind: 'ground' },
            { x: 420, y: 500, w: 140, h: 20, kind: 'thin' },
            // Pit 1 (x: 720 to 1080) with moving platform
            { x: 1080, y: 600, w: 860, h: 160, kind: 'ground' },
            { x: 1230, y: 495, w: 150, h: 20, kind: 'thin' },
            { x: 1460, y: 410, w: 220, h: 24, kind: 'stone' }, // Runic Sword & Nova Chest!
            // Pit 2 (x: 1940 to 2240)
            { x: 1960, y: 500, w: 110, h: 20, kind: 'stone' },
            { x: 2240, y: 600, w: 1210, h: 160, kind: 'ground' },
            { x: 2150, y: 390, w: 120, h: 22, kind: 'stone' }, // Switch platform across gap
            { x: 2680, y: 485, w: 130, h: 20, kind: 'thin' },
            { x: 3000, y: 485, w: 130, h: 20, kind: 'thin' }
        ],
        movingPlatforms: [
            { x: 760, y: 550, w: 120, h: 20, axis: 'x', range: 170, speed: 1.5 },
            { x: 2070, y: 540, w: 110, h: 20, axis: 'y', range: 95, speed: 1.6 }
        ],
        spikes: [
            { x: 720, y: 695, w: 360, h: 30 },
            { x: 1940, y: 695, w: 300, h: 30 }
        ],
        gates: [
            { id: 'gate2', x: 2470, y: 440, w: 28, h: 160, open: false }
        ],
        switches: [
            { id: 'sw2', x: 2195, y: 355, targetGate: 'gate2', active: false }
        ],
        crystals: [
            { x: 1840, y: 552 }
        ],
        npcs: [
            {
                id: 'explorer',
                name: 'Penjelajah Lyra',
                x: 185,
                y: 554,
                kind: 'elder',
                lines: [
                    'Hati-hati di Gua Kristal ini! Tengkorak Ksatria bisa menahan serangan jika kau terburu-buru.',
                    'Di tengah gua terdapat Peti Runik berisi Pedang Besi Runik dan Jurus Gelombang Api [L]. Jangan sampai terlewat!'
                ]
            }
        ],
        pots: [
            { x: 340, y: 570, kind: 'crate' },
            { x: 470, y: 470, kind: 'pot' },
            { x: 1180, y: 570, kind: 'pot' },
            { x: 1300, y: 465, kind: 'crate' },
            { x: 2350, y: 570, kind: 'pot' }
        ],
        chests: [
            { id: 'l2_sword', x: 1555, y: 376, reward: { swordId: 1, unlockNova: true, gold: 40 }, opened: false },
            { id: 'l2_c2', x: 2730, y: 451, reward: { gold: 45, potion: 1 }, opened: false }
        ],
        enemies: [
            { type: 'bat', x: 460, y: 360 },
            { type: 'skeleton', x: 580, y: 550 },
            { type: 'slime', x: 1210, y: 560 },
            { type: 'skeleton', x: 1410, y: 550 },
            { type: 'bat', x: 1650, y: 350 },
            { type: 'skeleton', x: 2330, y: 550 },
            { type: 'golem', x: 2910, y: 520, isBoss: true, bossName: 'Golem Kristal Purba' }
        ],
        portal: { x: 3300, y: 526, nextLevel: 2, requiresBoss: true }
    },

    // =========================================================================
    // LEVEL 3: RERUNTUHAN BENTENG KUNO (ANCIENT CITADEL RUINS)
    // =========================================================================
    {
        id: 2,
        name: 'Level 3: Reruntuhan Benteng',
        subtitle: 'Jalan Menuju Kastil',
        theme: 'ruins',
        width: 3600,
        height: 780,
        spawn: { x: 80, y: 550 },
        platforms: [
            { x: 0, y: 620, w: 940, h: 160, kind: 'ground' },
            { x: 500, y: 515, w: 150, h: 20, kind: 'thin' },
            { x: 730, y: 430, w: 160, h: 20, kind: 'stone' },
            // Bridge over chasm (940 -> 1440)
            { x: 1440, y: 620, w: 980, h: 160, kind: 'ground' },
            { x: 1580, y: 505, w: 150, h: 20, kind: 'thin' },
            { x: 1800, y: 410, w: 180, h: 22, kind: 'stone' },
            { x: 2060, y: 505, w: 150, h: 20, kind: 'thin' },
            // Upper tower & gate puzzle
            { x: 2420, y: 540, w: 130, h: 22, kind: 'stone' },
            { x: 2630, y: 620, w: 970, h: 160, kind: 'ground' },
            { x: 2740, y: 440, w: 140, h: 22, kind: 'stone' }
        ],
        movingPlatforms: [
            { x: 990, y: 580, w: 130, h: 20, axis: 'x', range: 260, speed: 1.75 },
            { x: 2440, y: 460, w: 110, h: 20, axis: 'y', range: 110, speed: 1.5 }
        ],
        spikes: [
            { x: 940, y: 720, w: 500, h: 30 },
            { x: 2420, y: 720, w: 210, h: 30 }
        ],
        gates: [
            { id: 'gate3', x: 2960, y: 460, w: 28, h: 160, open: false }
        ],
        switches: [
            { id: 'sw3', x: 2795, y: 405, targetGate: 'gate3', active: false }
        ],
        crystals: [
            { x: 1880, y: 362 }
        ],
        npcs: [
            {
                id: 'merchant3',
                name: 'Pedagang Garamond',
                x: 240,
                y: 574,
                kind: 'merchant'
            }
        ],
        pots: [
            { x: 410, y: 590, kind: 'crate' },
            { x: 560, y: 485, kind: 'pot' },
            { x: 1520, y: 590, kind: 'crate' },
            { x: 1640, y: 475, kind: 'pot' },
            { x: 2700, y: 590, kind: 'crate' }
        ],
        chests: [
            { id: 'l3_c1', x: 790, y: 396, reward: { gold: 65, potion: 1 }, opened: false },
            { id: 'l3_c2', x: 2115, y: 471, reward: { gold: 80 }, opened: false }
        ],
        enemies: [
            { type: 'skeleton', x: 640, y: 570 },
            { type: 'mage', x: 785, y: 380 },
            { type: 'knight', x: 1690, y: 560 },
            { type: 'mage', x: 1960, y: 570 },
            { type: 'bat', x: 2150, y: 350 },
            { type: 'knight', x: 2300, y: 560 },
            { type: 'knight', x: 3150, y: 560 },
            { type: 'mage', x: 3320, y: 570 }
        ],
        portal: { x: 3460, y: 546, nextLevel: 3, requiresBoss: false }
    },

    // =========================================================================
    // LEVEL 4: TAKHTA RAJA KEGELAPAN (DARK LORD'S SANCTUM)
    // =========================================================================
    {
        id: 3,
        name: 'Level 4: Takhta Raja Kegelapan',
        subtitle: 'Pertarungan Terakhir',
        theme: 'sanctum',
        width: 2600,
        height: 720,
        spawn: { x: 85, y: 510 },
        platforms: [
            { x: 0, y: 580, w: 2600, h: 160, kind: 'ground' },
            { x: 420, y: 475, w: 150, h: 20, kind: 'thin' },
            { x: 720, y: 475, w: 150, h: 20, kind: 'thin' },
            // Boss Arena elevated perches
            { x: 1470, y: 465, w: 140, h: 20, kind: 'thin' },
            { x: 1850, y: 410, w: 170, h: 20, kind: 'thin' },
            { x: 2230, y: 465, w: 140, h: 20, kind: 'thin' }
        ],
        movingPlatforms: [],
        spikes: [
            { x: 585, y: 560, w: 95, h: 20 }
        ],
        gates: [],
        switches: [],
        crystals: [
            { x: 1180, y: 532 }
        ],
        npcs: [
            {
                id: 'merchant4',
                name: 'Pedagang Garamond',
                x: 1100,
                y: 534,
                kind: 'merchant'
            }
        ],
        pots: [
            { x: 280, y: 550, kind: 'pot' },
            { x: 480, y: 445, kind: 'crate' },
            { x: 780, y: 445, kind: 'pot' },
            { x: 1270, y: 550, kind: 'crate' }
        ],
        chests: [
            { id: 'l4_c1', x: 1005, y: 546, reward: { gold: 90, potion: 2 }, opened: false }
        ],
        enemies: [
            { type: 'knight', x: 500, y: 520 },
            { type: 'mage', x: 780, y: 425 },
            { type: 'knight', x: 900, y: 520 },
            { type: 'malakor', x: 2060, y: 500, isBoss: true, bossName: 'Malakor, Raja Kegelapan' }
        ],
        portal: null
    }
];
