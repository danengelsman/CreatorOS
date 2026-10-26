// Sandbox presets for the interactive Brand Kit planner
export const SANDBOX_PRESETS: Record<string, Record<string, any>> = {
  cooking: {
    calm: {
      name: 'The Slow Apron',
      tagline: 'Mindful cooking from scratch with natural ingredients.',
      colors: {
        primary: '#7F9F7F',
        secondary: '#D2B48C',
        accent: '#E9967A',
        background: '#F5F5EC',
      },
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      hook: "In a world that never stops rushing, let's take ten minutes to watch fresh butter melt, bread rise, and food slowly cook to golden perfection.",
      catchphrase: 'Eat slowly, live deeply. Until next time in the kitchen.',
      vibeDesc:
        'Soft lighting, gentle cooking sounds, beautiful wooden plates, and natural ingredients.',
    },
    bold: {
      name: 'WOK & ROLL',
      tagline: 'High-heat, high-energy Asian street food recipes.',
      colors: {
        primary: '#FF4500',
        secondary: '#1A1A1A',
        accent: '#FFD700',
        background: '#1C1917',
      },
      fontHeading: 'Space Grotesk',
      fontBody: 'Fira Code',
      hook: 'Turn up your stove to the highest heat! Today we are making a classic street-style stir fry in just four minutes.',
      catchphrase: 'Keep cooking, stay active! See you next time!',
      vibeDesc:
        'Fast-paced video cuts, steaming hot pans, bright colorful titles, and high-energy music.',
    },
    educational: {
      name: 'Culinary Science',
      tagline: 'Discovering how cooking really works.',
      colors: {
        primary: '#007AFF',
        secondary: '#8E8E93',
        accent: '#FF9500',
        background: '#FFFFFF',
      },
      fontHeading: 'Outfit',
      fontBody: 'Inter',
      hook: 'Did you know that adding a pinch of salt to onions actually helps them cook more evenly? Today we are learning the science of cooking heat.',
      catchphrase: 'Keep learning, and enjoy your food!',
      vibeDesc:
        'Bright clean lighting, simple diagrams, exact measurements, and side-by-side comparisons.',
    },
  },
  tech: {
    calm: {
      name: 'Cozy Coding',
      tagline: 'Quiet coding sessions and cozy workspace designs.',
      colors: {
        primary: '#4A5568',
        secondary: '#EDF2F7',
        accent: '#805AD5',
        background: '#F7FAFC',
      },
      fontHeading: 'Inter',
      fontBody: 'JetBrains Mono',
      hook: "The rain is tapping gently on the window. Let's make a warm drink and write some clean, simple code together.",
      catchphrase: 'Happy coding!',
      vibeDesc:
        'Relaxing background music, warm desk lighting, quiet keyboard typing, and dark screen themes.',
    },
    bold: {
      name: 'CYBER CORE',
      tagline: 'Latest technology, software tips, and smart AI tools.',
      colors: {
        primary: '#00FF66',
        secondary: '#0A0A0C',
        accent: '#00E5FF',
        background: '#0D0D11',
      },
      fontHeading: 'Space Grotesk',
      fontBody: 'Fira Code',
      hook: 'A brand new AI model just launched! We are building a smart assistant that improves your code in under three seconds.',
      catchphrase: 'Build faster. Create more. See you next time!',
      vibeDesc:
        'Futuristic screen graphics, glowing neon colors, digital dashboards, and engaging transitions.',
    },
    educational: {
      name: 'Byte Sized',
      tagline: 'Computer science made incredibly simple.',
      colors: {
        primary: '#34C759',
        secondary: '#F2F2F7',
        accent: '#007AFF',
        background: '#FFFFFF',
      },
      fontHeading: 'Outfit',
      fontBody: 'Inter',
      hook: 'How does computer memory actually work? Think of your computer memory as a hotel, where each file gets its own room key card.',
      catchphrase: 'Explaining technology, one step at a time.',
      vibeDesc: 'Clear whiteboard drawings, color-coded highlights, and simple examples.',
    },
  },
  finance: {
    calm: {
      name: 'The Steady Investor',
      tagline: 'Simple, low-stress investing for everyday people.',
      colors: {
        primary: '#2E7D32',
        secondary: '#F1F8E9',
        accent: '#7CB342',
        background: '#FAFAFA',
      },
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      hook: "You don't need to trade complex stocks to build your savings. Let's look at how a simple index fund grows over thirty years.",
      catchphrase: 'Start small, stay consistent. Take care.',
      vibeDesc: 'Warm friendly backgrounds, simple line charts, and clean handwritten notes.',
    },
    bold: {
      name: 'ALPHA VENTURES',
      tagline: 'Company analysis and global market trends.',
      colors: {
        primary: '#FF3B30',
        secondary: '#1C1C1E',
        accent: '#5856D6',
        background: '#0B0B0C',
      },
      fontHeading: 'Space Grotesk',
      fontBody: 'Fira Code',
      hook: "Three small energy companies are quietly growing very fast. Let's look at their financial reports before everyone else does.",
      catchphrase: 'Protect your savings, grow your future.',
      vibeDesc:
        'Professional charts, clean financial spreadsheets, and clear red and green accents.',
    },
    educational: {
      name: 'Finance Academy',
      tagline: 'Building solid personal financial foundations.',
      colors: {
        primary: '#10B981',
        secondary: '#F3F4F6',
        accent: '#3B82F6',
        background: '#FFFFFF',
      },
      fontHeading: 'Outfit',
      fontBody: 'Inter',
      hook: "Many people spend money on things that actually cost them money over time. Let's break down how to make your money work for you.",
      catchphrase: 'Take control of your money, take control of your future.',
      vibeDesc: 'Clear animated charts, helpful percentage highlights, and real-life examples.',
    },
  },
};

export const FAQS = [
  {
    q: 'Do I need any design or coding experience to use CreatorOS?',
    a: 'Absolutely not! CreatorOS is designed with simplicity in mind. Our AI Design Assistant automatically picks matching colors, selects beautiful fonts, and organizes your entire brand theme so you can focus 100% on making your videos.',
  },
  {
    q: 'How does the AI Video Intro Maker work?',
    a: "It looks at your selected topic, style, and who your videos are for. Then, it uses simple, proven patterns (like starting with an interesting question or a bold statement) to help you write video openings that catch people's attention immediately.",
  },
  {
    q: 'What is the 30-Day Growth Challenge?',
    a: "It's an interactive guide built right into the app. It walks you through simple daily steps—from choosing your main topic on Day 1, to writing video intros on Day 7, to building a consistent publishing routine by Day 30.",
  },
  {
    q: 'Can I cancel my plan at any time?',
    a: 'There is nothing to cancel right now: CreatorOS is completely free during early access and has no subscription. If paid plans are ever introduced, that will be announced clearly before anything changes — and any early-access decision you make will be yours.',
  },
];
