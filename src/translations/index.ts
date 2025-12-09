export type Language = 'en' | 'es' | 'it' | 'ca';

export interface Translations {
  // Chat page
  chat: {
    welcome: string;
    promoterLink: string;
    placeholder: string;
  };
  // Promoter page
  promoter: {
    title: string;
    subtitle: string;
    videoPlaceholder: string;
    videoDescription: string;
    ctaButton: string;
    learnMore: string;
    moreAboutLaiive: string;
    welcomeTitle: string;
    welcomeText: string;
    backToUser: string;
  };
  // About page
  about: {
    title: string;
    philosophyTitle: string;
    philosophyText: string;
    aiEthicsTitle: string;
    aiEthicsText: string;
    smallVenuesTitle: string;
    smallVenuesText: string;
    joinTitle: string;
    joinText: string;
    back: string;
  };
  // Language selector
  language: {
    label: string;
  };
  // Promoter create page
  promoterCreate: {
    welcome: string;
    placeholder: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    chat: {
      welcome: "Hey! 👋 I'm here to help you discover amazing live music events near you. What are you in the mood for today?",
      promoterLink: "promoter/musician →",
      placeholder: "Tell me what you're looking for...",
    },
    promoter: {
      title: "Small stages. Big connections.",
      subtitle: "Share your events with thousands of music lovers",
      videoPlaceholder: "Walkthrough video placeholder",
      videoDescription: "Video will be embedded here",
      ctaButton: "Push your event now",
      learnMore: "Learn more about the project →",
      moreAboutLaiive: "more about laiive →",
      welcomeTitle: "help laiive to lead a cultural revolution 🎵🎵🎵",
      welcomeText: "Your feedback is valuable to us. Tell us how we can help you build a community around your events.",
      backToUser: "← public app",
    },
    about: {
      title: "About the Project",
      philosophyTitle: "Our Philosophy",
      philosophyText: "We believe live music is the heartbeat of local communities. Small venues, emerging artists, and independent promoters deserve the same visibility as major events. Our platform connects passionate music lovers with authentic live experiences, making it easier to discover what's happening in your neighborhood.",
      aiEthicsTitle: "AI Ethics Layer",
      aiEthicsText: "Our AI-powered search is designed to be fair and transparent. We don't favor paid promotions or big venues. Instead, we match users with events based on their genuine interests and location. The AI learns what matters to local music scenes—authenticity, diversity, and accessibility. Your data stays private, and our recommendations stay honest.",
      smallVenuesTitle: "Why Small Venues Matter",
      smallVenuesText: "Small venues are where legends are born. They're where communities gather, where new sounds emerge, and where music stays real. But they often struggle with visibility and marketing. We're building tools to amplify their voice without changing their soul. By making event discovery smarter and more accessible, we help keep local music scenes alive and thriving.",
      joinTitle: "Join the Movement",
      joinText: "As an early partner, you're helping us shape the future of live music discovery. Your feedback, your events, and your community make this platform what it is. Together, we're creating something that puts people and music first—not algorithms and advertising.",
      back: "← back",
    },
    language: {
      label: "Language",
    },
    promoterCreate: {
      welcome: "Hi! Tell me about your event and I'll help you publish it on laiive.",
      placeholder: "Describe your event...",
    },
  },
  es: {
    chat: {
      welcome: "¡Hola! 👋 Estoy aquí para ayudarte a descubrir increíbles eventos de música en vivo cerca de ti. ¿Qué te apetece hoy?",
      promoterLink: "promotor/músico →",
      placeholder: "Dime qué estás buscando...",
    },
    promoter: {
      title: "Escenarios pequeños. Grandes conexiones.",
      subtitle: "Comparte tus eventos con miles de amantes de la música",
      videoPlaceholder: "Marcador de video tutorial",
      videoDescription: "El video se incrustará aquí",
      ctaButton: "Publica tu evento ahora",
      learnMore: "Más información sobre el proyecto →",
      moreAboutLaiive: "más sobre laiive →",
      welcomeTitle: "ayuda a laiive a liderar una revolución cultural 🎵🎵🎵",
      welcomeText: "Tu feedback es valioso para nosotros. Cuéntanos cómo podemos ayudarte a construir una comunidad alrededor de tus eventos.",
      backToUser: "← app pública",
    },
    about: {
      title: "Sobre el Proyecto",
      philosophyTitle: "Nuestra Filosofía",
      philosophyText: "Creemos que la música en vivo es el corazón de las comunidades locales. Los lugares pequeños, artistas emergentes y promotores independientes merecen la misma visibilidad que los grandes eventos. Nuestra plataforma conecta amantes apasionados de la música con experiencias auténticas en vivo, facilitando descubrir qué está pasando en tu barrio.",
      aiEthicsTitle: "Capa de Ética de IA",
      aiEthicsText: "Nuestra búsqueda impulsada por IA está diseñada para ser justa y transparente. No favorecemos promociones pagadas ni grandes lugares. En cambio, conectamos usuarios con eventos basados en sus intereses genuinos y ubicación. La IA aprende lo que importa a las escenas musicales locales: autenticidad, diversidad y accesibilidad. Tus datos permanecen privados y nuestras recomendaciones honestas.",
      smallVenuesTitle: "Por Qué Importan los Lugares Pequeños",
      smallVenuesText: "Los lugares pequeños son donde nacen las leyendas. Son donde las comunidades se reúnen, donde emergen nuevos sonidos y donde la música se mantiene real. Pero a menudo luchan con visibilidad y marketing. Estamos construyendo herramientas para amplificar su voz sin cambiar su alma. Al hacer el descubrimiento de eventos más inteligente y accesible, ayudamos a mantener vivas las escenas musicales locales.",
      joinTitle: "Únete al Movimiento",
      joinText: "Como socio fundador, estás ayudándonos a dar forma al futuro del descubrimiento de música en vivo. Tu feedback, tus eventos y tu comunidad hacen que esta plataforma sea lo que es. Juntos, estamos creando algo que pone a las personas y la música primero, no algoritmos y publicidad.",
      back: "← atrás",
    },
    language: {
      label: "Idioma",
    },
    promoterCreate: {
      welcome: "¡Hola! Cuéntame sobre tu evento y te ayudaré a publicarlo en laiive.",
      placeholder: "Describe tu evento...",
    },
  },
  it: {
    chat: {
      welcome: "Ciao! 👋 Sono qui per aiutarti a scoprire fantastici eventi di musica dal vivo vicino a te. Cosa ti va oggi?",
      promoterLink: "promoter/musicista →",
      placeholder: "Dimmi cosa stai cercando...",
    },
    promoter: {
      title: "Piccoli palchi. Grandi connessioni.",
      subtitle: "Condividi i tuoi eventi con migliaia di amanti della musica",
      videoPlaceholder: "Segnaposto video tutorial",
      videoDescription: "Il video sarà incorporato qui",
      ctaButton: "Pubblica il tuo evento ora",
      learnMore: "Scopri di più sul progetto →",
      moreAboutLaiive: "più su laiive →",
      welcomeTitle: "aiuta laiive a guidare una rivoluzione culturale 🎵🎵🎵",
      welcomeText: "Il tuo feedback è prezioso per noi. Raccontaci come possiamo aiutarti a costruire una comunità attorno ai tuoi eventi.",
      backToUser: "← app pubblica",
    },
    about: {
      title: "Sul Progetto",
      philosophyTitle: "La Nostra Filosofia",
      philosophyText: "Crediamo che la musica dal vivo sia il battito del cuore delle comunità locali. I piccoli locali, gli artisti emergenti e i promoter indipendenti meritano la stessa visibilità dei grandi eventi. La nostra piattaforma connette gli amanti appassionati della musica con esperienze autentiche dal vivo, rendendo più facile scoprire cosa succede nel tuo quartiere.",
      aiEthicsTitle: "Livello di Etica dell'IA",
      aiEthicsText: "La nostra ricerca basata sull'IA è progettata per essere equa e trasparente. Non favoriamo promozioni a pagamento o grandi locali. Invece, abbiniamo gli utenti con eventi basati sui loro interessi genuini e posizione. L'IA impara ciò che conta per le scene musicali locali: autenticità, diversità e accessibilità. I tuoi dati rimangono privati e le nostre raccomandazioni oneste.",
      smallVenuesTitle: "Perché i Piccoli Locali Contano",
      smallVenuesText: "I piccoli locali sono dove nascono le leggende. Sono dove le comunità si riuniscono, dove emergono nuovi suoni e dove la musica rimane vera. Ma spesso lottano con visibilità e marketing. Stiamo costruendo strumenti per amplificare la loro voce senza cambiare la loro anima. Rendendo la scoperta di eventi più intelligente e accessibile, aiutiamo a mantenere vive le scene musicali locali.",
      joinTitle: "Unisciti al Movimento",
      joinText: "Come partner iniziale, stai aiutandoci a plasmare il futuro della scoperta di musica dal vivo. Il tuo feedback, i tuoi eventi e la tua comunità rendono questa piattaforma ciò che è. Insieme, stiamo creando qualcosa che mette le persone e la musica al primo posto, non algoritmi e pubblicità.",
      back: "← indietro",
    },
    language: {
      label: "Lingua",
    },
    promoterCreate: {
      welcome: "Ciao! Raccontami del tuo evento e ti aiuterò a pubblicarlo su laiive.",
      placeholder: "Descrivi il tuo evento...",
    },
  },
  ca: {
    chat: {
      welcome: "Hola! 👋 Estic aquí per ajudar-te a descobrir increïbles esdeveniments de música en directe a prop teu. Què t'agradaria avui?",
      promoterLink: "promotor/músic →",
      placeholder: "Digues-me què estàs buscant...",
    },
    promoter: {
      title: "Escenaris petits. Grans connexions.",
      subtitle: "Comparteix els teus esdeveniments amb milers d'amants de la música",
      videoPlaceholder: "Marcador de vídeo tutorial",
      videoDescription: "El vídeo s'inserirà aquí",
      ctaButton: "Publica el teu esdeveniment ara",
      learnMore: "Més informació sobre el projecte →",
      moreAboutLaiive: "més sobre laiive →",
      welcomeTitle: "ajuda laiive a liderar una revolució cultural 🎵🎵🎵",
      welcomeText: "El teu feedback és valuós per a nosaltres. Explica'ns com podem ajudar-te a construir una comunitat al voltant dels teus esdeveniments.",
      backToUser: "← app pública",
    },
    about: {
      title: "Sobre el Projecte",
      philosophyTitle: "La Nostra Filosofia",
      philosophyText: "Creiem que la música en directe és el cor de les comunitats locals. Els llocs petits, artistes emergents i promotors independents mereixen la mateixa visibilitat que els grans esdeveniments. La nostra plataforma connecta amants apassionats de la música amb experiències autèntiques en directe, facilitant descobrir què passa al teu barri.",
      aiEthicsTitle: "Capa d'Ètica d'IA",
      aiEthicsText: "La nostra cerca impulsada per IA està dissenyada per ser justa i transparent. No afavorim promocions pagades ni grans locals. En canvi, connectem usuaris amb esdeveniments basats en els seus interessos genuïns i ubicació. La IA aprèn el que importa a les escenes musicals locals: autenticitat, diversitat i accessibilitat. Les teves dades romanen privades i les nostres recomanacions honestes.",
      smallVenuesTitle: "Per Què Importen els Llocs Petits",
      smallVenuesText: "Els llocs petits són on neixen les llegendes. Són on les comunitats es reuneixen, on emergeixen nous sons i on la música es manté real. Però sovint lluiten amb visibilitat i màrqueting. Estem construint eines per amplificar la seva veu sense canviar la seva ànima. Fent el descobriment d'esdeveniments més intel·ligent i accessible, ajudem a mantenir vives les escenes musicals locals.",
      joinTitle: "Uneix-te al Moviment",
      joinText: "Com a soci fundador, estàs ajudant-nos a donar forma al futur del descobriment de música en directe. El teu feedback, els teus esdeveniments i la teva comunitat fan que aquesta plataforma sigui el que és. Junts, estem creant alguna cosa que posa les persones i la música primer, no algorismes i publicitat.",
      back: "← enrere",
    },
    language: {
      label: "Idioma",
    },
    promoterCreate: {
      welcome: "Hola! Explica'm sobre el teu esdeveniment i t'ajudaré a publicar-lo a laiive.",
      placeholder: "Descriu el teu esdeveniment...",
    },
  },
};