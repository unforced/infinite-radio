// Curated Strudel pattern examples for AI DJ
// Organized by technique and style for rich, evolving music

export const STRUDEL_TECHNIQUES = {
  // ============================================
  // LAYERING - Using stack() for rich textures
  // ============================================
  layering: `
// Multi-layer ambient composition
stack(
  // Pad layer - slow evolving chords
  note("<C3 Eb3 G3 Bb3>/2")
    .s("sawtooth")
    .cutoff(sine.range(400, 1200).slow(8))
    .resonance(10)
    .attack(0.5).decay(0.2).sustain(0.7).release(1.5)
    .room(0.8).size(0.9),
  // Bass layer
  note("<C2 C2 Eb2 G2>/4")
    .s("sawtooth")
    .cutoff(300)
    .decay(0.3),
  // Texture layer - high sparkles
  note("c5 eb5 g5 bb5".split(" ").join(" ~ "))
    .s("triangle")
    .velocity(0.3)
    .delay(0.5).delaytime(0.125)
)
`,

  // ============================================
  // MODULATION - Continuous parameter control
  // ============================================
  modulation: `
// Filter sweep with multiple LFOs
note("c3 eb3 g3 bb3")
  .s("sawtooth")
  .cutoff(sine.range(200, 2000).slow(8))
  .resonance(saw.range(5, 20).slow(4))
  .pan(sine.range(0.3, 0.7).slow(2))
  .room(tri.range(0.3, 0.8).slow(16))
  .delay(perlin.range(0, 0.4).slow(4))
`,

  // ============================================
  // POLYMETER - Different cycle lengths
  // ============================================
  polymeter: `
// 3-against-4 polyrhythm
stack(
  note("c2 g2 c2 eb2").slow(4).s("sawtooth").cutoff(400),
  note("c4 eb4 g4").slow(3).s("sine").velocity(0.6),
  s("bd*4, ~ hh ~ hh, ~ ~ sd ~").bank("RolandTR808")
)
`,

  // ============================================
  // EVOLUTION - Patterns that change over time
  // ============================================
  evolution: `
// Pattern that evolves every few cycles
note("c4 eb4 g4 bb4")
  .s("piano")
  .velocity(0.6)
  .every(4, x => x.rev())
  .every(8, x => x.fast(2))
  .every(16, x => x.add(note("7")))
  .sometimes(x => x.delay(0.25))
  .room(0.5)
`,

  // ============================================
  // EFFECTS CHAIN - Full processing
  // ============================================
  effects: `
// Rich effect chain with envelopes
note("c3 eb3 g3 bb3")
  .s("sawtooth")
  .attack(0.1).decay(0.2).sustain(0.6).release(0.8)
  .lpf(sine.range(500, 2000).slow(4))
  .hpf(100)
  .room(0.7).size(0.9)
  .delay(0.25).delaytime(0.125).delayfeedback(0.4)
  .pan(sine.slow(2))
`,

  // ============================================
  // EUCLIDEAN - Algorithmic rhythms
  // ============================================
  euclidean: `
// Euclidean rhythm patterns
stack(
  s("bd(3,8)").bank("RolandTR909"),
  s("sd(2,8,1)").bank("RolandTR909").velocity(0.8),
  s("hh(5,8)").bank("RolandTR909").velocity(0.5),
  note("c2(3,8) eb2(2,8)").s("sawtooth").cutoff(400)
)
`,
};

export const STYLE_EXAMPLES = {
  // ============================================
  // AMBIENT
  // ============================================
  ambient: `
// Ethereal ambient soundscape
stack(
  note("<C3 E3 G3 B3>/4")
    .s("sine")
    .attack(2).decay(1).sustain(0.8).release(4)
    .room(0.95).size(0.95)
    .delay(0.6).delaytime(0.5).delayfeedback(0.5),
  note("<G4 B4 D5>/8")
    .s("triangle")
    .velocity(0.2)
    .attack(1).release(2)
    .delay(0.7).delaytime(0.375)
).slow(2)
`,

  // ============================================
  // LOFI
  // ============================================
  lofi: `
// Lofi hip-hop vibes
stack(
  note("<Cm7 Fm7 Bb7 EbM7>/4")
    .voicing()
    .s("piano")
    .velocity(0.5)
    .lpf(2000)
    .room(0.4),
  s("bd ~ bd ~, ~ sd ~ sd, hh*4")
    .bank("RolandTR808")
    .velocity(0.7)
    .lpf(3000),
  note("c3 ~ eb3 ~ g3 ~ bb3 ~")
    .s("sawtooth")
    .cutoff(800)
    .velocity(0.4)
).slow(2)
`,

  // ============================================
  // TECHNO
  // ============================================
  techno: `
// Driving minimal techno
stack(
  s("bd*4").bank("RolandTR909"),
  s("~ hh ~ hh").bank("RolandTR909").velocity(0.6),
  s("~ ~ ~ sd:3").bank("RolandTR909").velocity(0.9),
  note("c2*2")
    .s("sawtooth")
    .cutoff(sine.range(200, 800).slow(4))
    .decay(0.15)
    .every(4, x => x.add(note("5")))
).fast(1.5)
`,

  // ============================================
  // HOUSE
  // ============================================
  house: `
// Classic house groove
stack(
  s("bd ~ bd ~, ~ ~ sd ~, [~ hh]*4")
    .bank("RolandTR909"),
  note("<Cm7 Fm7>/4")
    .voicing()
    .s("piano")
    .velocity(0.5)
    .room(0.3),
  note("c3 ~ c3 eb3, ~ g3 ~ bb3")
    .s("sawtooth")
    .cutoff(sine.range(400, 1200).slow(8))
    .velocity(0.6)
)
`,

  // ============================================
  // JAZZ
  // ============================================
  jazz: `
// Late night jazz
stack(
  note("<Dm7 G7 CM7 FM7>/4")
    .voicing()
    .s("piano")
    .velocity("<0.5 0.6 0.5 0.55>")
    .room(0.5),
  note("d2 ~ a2 ~, ~ ~ e2 ~")
    .s("sawtooth")
    .cutoff(600)
    .velocity(0.6),
  s("~ hh ~ hh, ~ ~ sd ~")
    .bank("RolandTR808")
    .velocity(0.4)
).slow(2)
`,

  // ============================================
  // DOWNTEMPO
  // ============================================
  downtempo: `
// Chill downtempo groove
stack(
  note("<Am7 Dm7 GM7 CM7>/4")
    .voicing()
    .s("piano")
    .velocity(0.5)
    .lpf(3000)
    .room(0.6),
  s("bd ~ ~ bd, ~ sd ~ ~, hh*2")
    .bank("RolandTR808")
    .velocity(0.7),
  note("a2 ~ e3 ~")
    .s("triangle")
    .cutoff(800)
    .attack(0.1).release(0.5)
).slow(2)
`,

  // ============================================
  // DRONE
  // ============================================
  drone: `
// Deep drone meditation
stack(
  note("c2")
    .s("sawtooth")
    .cutoff(sine.range(100, 400).slow(32))
    .attack(4).release(8)
    .room(0.95),
  note("<g2 f2>/16")
    .s("sine")
    .attack(8).release(8)
    .velocity(0.4),
  note("c4 g4 c5".split(" ").join(" ~ ~ ~ "))
    .s("triangle")
    .velocity(0.15)
    .delay(0.8).delaytime(0.666)
).slow(4)
`,
};

// ============================================
// PROMPT ENHANCEMENT HELPERS
// ============================================

export function getStyleExamples(style: string): string {
  const normalizedStyle = style.toLowerCase();

  // Find matching style or return ambient as default
  for (const [key, example] of Object.entries(STYLE_EXAMPLES)) {
    if (normalizedStyle.includes(key)) {
      return example;
    }
  }

  return STYLE_EXAMPLES.ambient;
}

export function getTechniqueGuidance(energy: 'low' | 'medium' | 'high'): string {
  switch (energy) {
    case 'low':
      return `
Use these techniques for low energy:
- Long attack and release times (attack > 0.5, release > 2)
- Slow filter sweeps (.slow(8) or higher)
- Minimal drum patterns or no drums
- Wide reverb (.room(0.8+), .size(0.8+))
- Slow pattern speeds (.slow(2) or more)
`;
    case 'high':
      return `
Use these techniques for high energy:
- Short, punchy envelopes (attack < 0.1, decay < 0.3)
- Fast filter movements (.slow(2) or faster)
- Driving drum patterns with kick on every beat
- Euclidean rhythms for complexity
- Use .fast(1.5) or .fast(2) for intensity
- Add .every() for variation and build-up
`;
    default:
      return `
Use these techniques for medium energy:
- Balanced envelopes (attack 0.1-0.3, release 0.5-1)
- Moderate filter sweeps (.slow(4))
- Groove-based drum patterns
- Layer 2-3 elements with stack()
- Use .sometimes() for subtle variation
`;
  }
}

export function buildEnhancedPrompt(
  basePrompt: string,
  style: string,
  energy: 'low' | 'medium' | 'high',
  techniques: string[] = ['layering', 'modulation']
): string {
  const styleExample = getStyleExamples(style);
  const techniqueGuidance = getTechniqueGuidance(energy);

  const selectedTechniques = techniques
    .map(t => STRUDEL_TECHNIQUES[t as keyof typeof STRUDEL_TECHNIQUES])
    .filter(Boolean)
    .join('\n');

  return `${basePrompt}

=== STYLE REFERENCE ===
${styleExample}

=== TECHNIQUE EXAMPLES ===
${selectedTechniques}

=== ENERGY GUIDANCE ===
${techniqueGuidance}

Remember:
1. Create a SINGLE expression (no semicolons, no multiple statements)
2. Use stack() for layering multiple elements
3. Apply effects like .room(), .delay(), .cutoff() for richness
4. Use .slow() or .fast() to control overall tempo feel
5. Use signal functions like sine.range() for evolving parameters
6. Consider .every() and .sometimes() for variation over time
`;
}
