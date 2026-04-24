export type Locale = "pt-BR" | "en";

export interface Translations {
  common: {
    loading: string;
    networkError: string;
    cancel: string;
    confirm: string;
    home: string;
    back: string;
    points: string;
    you: string;
    close: string;
    kick: string;
    kicking: string;
    kickTitle: string;
    kickConfirm: (name: string) => string;
    kickParticipantAria: (name: string) => string;
    creator: string;
  };
  theme: {
    toggleAria: string;
    light: string;
    dark: string;
    system: string;
  };
  landing: {
    tagline: string;
    createTournament: string;
    orEnterCode: string;
    codeCharsHint: string;
    codeProgress: (current: number, total: number) => string;
    codeComplete: string;
    joinTournament: string;
    checking: string;
    tournamentNotFound: (code: string) => string;
    footer: string;
  };
  createTournament: {
    title: string;
    subtitle: string;
    tournamentNameLabel: string;
    tournamentNamePlaceholder: string;
    candidatesLabel: string;
    candidatesHint: string;
    itemPlaceholder: (n: number) => string;
    addUpTo: (n: number) => string;
    roundThemesLabel: string;
    roundThemesHint: string;
    final: string;
    roundLabel: (n: number) => string;
    roundPlaceholders: [string, string, string];
    roundPlaceholderFinal: string;
    roundPlaceholderDefault: string;
    creating: string;
    create: string;
    somethingWentWrong: string;
  };
  lobby: {
    waitingRoom: string;
    tournamentCode: string;
    copyLink: string;
    copied: string;
    participantsSection: string;
    bracketSection: string;
    items: (n: number) => string;
    joinTitle: string;
    joinButton: string;
    joining: string;
    joinFailed: string;
    kickError: string;
  };
  lobbyCTA: {
    makePicks: string;
    editPicks: string;
    waitingPicksFrom: string;
    readyCount: (ready: number, total: number) => string;
    allReady: string;
    startTournament: string;
    starting: string;
    waitingCreator: string;
  };
  bracket: {
    waitingRoom: string;
    yourPicks: string;
    fillBracket: string;
    fromRound: (n: number) => string;
    picksSubmitted: string;
    viewRanking: string;
    picksProgress: (picked: number, eligible: number) => string;
    allFilled: string;
    stillMissing: (n: number) => string;
    sendPicks: string;
    editPicks: string;
    sending: string;
    saving: string;
    picksSaved: string;
    saveFailed: string;
    reorderError: string;
    reorderNetworkError: string;
    dragToReorder: string;
  };
  live: {
    score: string;
    confirmWinner: string;
    confirmWinnerText: (name: string) => string;
    waitingPicksFrom: string;
    picksRequired: string;
    clickWinner: string;
    match: (n: number) => string;
    saving: string;
    toBeDefined: string;
    bracketSection: string;
    rankingSection: string;
    participantsSection: string;
    winnerError: string;
    kickError: string;
  };
  results: {
    yourScore: string;
    points: string;
    correct: string;
    played: string;
    waiting: string;
    rankingSection: string;
    myPicksSection: string;
    bracketSection: string;
    won: string;
    youChose: string;
    noResults: string;
    finished: string;
    inProgress: string;
    setWinnersBack: string;
    myPicksBack: string;
  };
  rankingsTable: {
    rankHeader: string;
    nameHeader: string;
    pointsHeader: string;
  };
  bracketView: {
    final: string;
    round: (n: number) => string;
    tbd: string;
    champion: string;
  };
  auth: {
    signInWithGoogle: string;
    signOut: string;
    signInToCreate: string;
    signInToJoin: string;
    joiningAuto: string;
    oauthFailed: string;
    oauthExpired: string;
  };
  appHeader: {
    brand: string;
    openMenu: string;
    openSettings: string;
    accountSection: string;
    themeSection: string;
    languageSection: string;
  };
  history: {
    title: string;
    subtitle: string;
    noTournaments: string;
    creatorBadge: string;
    participantBadge: string;
    statusLobby: string;
    statusActive: string;
    statusFinished: string;
    viewTournament: string;
    participantCount: (n: number) => string;
  };
  apiErrors: Record<string, string>;
}

export const ptBR: Translations = {
  common: {
    loading: "Carregando…",
    networkError: "Erro de rede.",
    cancel: "Cancelar",
    confirm: "Confirmar",
    home: "Início",
    back: "Voltar",
    points: "pontos",
    you: "(você)",
    close: "Fechar",
    kick: "Expulsar",
    kicking: "Expulsando…",
    kickTitle: "Expulsar participante",
    kickConfirm: (name) => `Tem certeza que deseja expulsar ${name}? Esta ação não pode ser desfeita.`,
    kickParticipantAria: (name) => `Expulsar ${name}`,
    creator: "criador",
  },
  theme: {
    toggleAria: "Alternar tema",
    light: "Claro",
    dark: "Escuro",
    system: "Sistema",
  },
  landing: {
    tagline: "Palpites de chaveamento para sua equipe",
    createTournament: "Criar torneio",
    orEnterCode: "ou entre com um código",
    codeCharsHint: "Códigos não usam 0, 1, I ou O — difíceis de distinguir. Use A–Z (exceto I e O) ou 2–9.",
    codeProgress: (current, total) => `${current} / ${total} caracteres`,
    codeComplete: "Código completo — pronto para entrar!",
    joinTournament: "Entrar no torneio",
    checking: "Verificando…",
    tournamentNotFound: (code) => `Torneio "${code}" não encontrado. Verifique o código e tente novamente.`,
    footer: "Chaveamento estilo bracket · Para atividades em equipe",
  },
  createTournament: {
    title: "Criar torneio",
    subtitle: "Configure o chaveamento e convide sua equipe.",
    tournamentNameLabel: "Nome do torneio",
    tournamentNamePlaceholder: "Ex: Copa do Mundo, Oscar 2025…",
    candidatesLabel: "Candidatos",
    candidatesHint: "Deve ter 4, 8, 16 ou 32 itens. Pressione Enter para avançar, Backspace para remover.",
    itemPlaceholder: (n) => `Item ${n}`,
    addUpTo: (n) => `adicione até ${n}`,
    roundThemesLabel: "Tema de cada rodada",
    roundThemesHint: `O que está sendo disputado em cada fase? Ex: "Melhor bandeira", "Melhor culinária".`,
    final: "Final",
    roundLabel: (n) => `Rodada ${n}`,
    roundPlaceholders: ["Ex: Fase de grupos", "Ex: Quartas de final", "Ex: Semifinal"],
    roundPlaceholderFinal: "Ex: Grande Final",
    roundPlaceholderDefault: "Nome da fase",
    creating: "Criando torneio…",
    create: "Criar torneio",
    somethingWentWrong: "Algo deu errado.",
  },
  lobby: {
    waitingRoom: "Sala de espera",
    tournamentCode: "Código do torneio",
    copyLink: "Copiar link",
    copied: "Copiado!",
    participantsSection: "Participantes",
    bracketSection: "Chaveamento",
    items: (n) => `${n} itens`,
    joinTitle: "Entrar no torneio",
    joinButton: "Entrar no torneio",
    joining: "Entrando…",
    joinFailed: "Falha ao entrar.",
    kickError: "Erro ao expulsar.",
  },
  lobbyCTA: {
    makePicks: "Fazer palpites",
    editPicks: "Editar palpites",
    waitingPicksFrom: "Aguardando palpites de:",
    readyCount: (ready, total) => `· ${ready} de ${total} prontos.`,
    allReady: "Todos os participantes enviaram seus palpites. Pronto para iniciar!",
    startTournament: "Iniciar torneio",
    starting: "Iniciando torneio…",
    waitingCreator: "Aguardando o criador iniciar o torneio…",
  },
  bracket: {
    waitingRoom: "Sala de espera",
    yourPicks: "Seus palpites",
    fillBracket: "Preencha o chaveamento",
    fromRound: (n) => `Palpites — a partir da rodada ${n}`,
    picksSubmitted: "Palpites enviados — acompanhe o resultado ao vivo!",
    viewRanking: "Ver ranking",
    picksProgress: (picked, eligible) => `${picked} de ${eligible} palpites preenchidos`,
    allFilled: "Tudo preenchido!",
    stillMissing: (n) => `Ainda faltam ${n} escolhas`,
    sendPicks: "Enviar palpites",
    editPicks: "Editar palpites",
    sending: "Enviando…",
    saving: "Salvando…",
    picksSaved: "Palpites enviados!",
    saveFailed: "Falha ao salvar.",
    reorderError: "Erro ao reordenar.",
    reorderNetworkError: "Erro de rede ao reordenar.",
    dragToReorder: "Arrastar para reordenar",
  },
  live: {
    score: "Placar",
    confirmWinner: "Confirmar vencedor",
    confirmWinnerText: (name) =>
      `Tem certeza que ${name} ganhou essa partida? Essa ação não pode ser desfeita.`,
    waitingPicksFrom: "Aguardando palpites de:",
    picksRequired: "Os vencedores não podem ser definidos até que todos enviem seus palpites.",
    clickWinner: "clique no vencedor",
    match: (n) => `Partida ${n}`,
    saving: "Salvando…",
    toBeDefined: "A definir",
    bracketSection: "Chaveamento",
    rankingSection: "Ranking atual",
    participantsSection: "Participantes",
    winnerError: "Erro ao salvar vencedor.",
    kickError: "Erro ao expulsar.",
  },
  results: {
    yourScore: "Sua pontuação",
    points: "pontos",
    correct: "Corretos",
    played: "Disputados",
    waiting: "Aguardando",
    rankingSection: "Ranking",
    myPicksSection: "Meus palpites",
    bracketSection: "Chaveamento",
    won: "ganhou",
    youChose: "Você escolheu:",
    noResults: "Nenhum resultado ainda — aguardando a primeira partida.",
    finished: "Finalizado",
    inProgress: "Em andamento",
    setWinnersBack: "Definir vencedores",
    myPicksBack: "Meus palpites",
  },
  rankingsTable: {
    rankHeader: "#",
    nameHeader: "Nome",
    pointsHeader: "Pontos",
  },
  bracketView: {
    final: "Final",
    round: (n) => `Rodada ${n}`,
    tbd: "A definir",
    champion: "Campeão",
  },
  auth: {
    signInWithGoogle: "Entrar com Google",
    signOut: "Sair",
    signInToCreate: "Entre com sua conta Google para criar um torneio.",
    signInToJoin: "Entre com sua conta Google para entrar neste torneio.",
    joiningAuto: "Entrando no torneio…",
    oauthFailed: "Falha ao entrar com o Google. Tente novamente.",
    oauthExpired: "O login expirou. Tente novamente.",
  },
  appHeader: {
    brand: "Chaveio",
    openMenu: "Abrir menu",
    openSettings: "Abrir configurações",
    accountSection: "Conta",
    themeSection: "Tema",
    languageSection: "Idioma",
  },
  history: {
    title: "Meus torneios",
    subtitle: "Torneios que você criou ou participou",
    noTournaments: "Você ainda não participou de nenhum torneio.",
    creatorBadge: "Criador",
    participantBadge: "Participante",
    statusLobby: "Sala de espera",
    statusActive: "Em andamento",
    statusFinished: "Finalizado",
    viewTournament: "Ver torneio",
    participantCount: (n) => `${n} participante${n !== 1 ? "s" : ""}`,
  },
  apiErrors: {
    "Invalid request body.": "Requisição inválida.",
    "Missing token.": "Token ausente.",
    "Invalid token.": "Token inválido.",
    "Creator only.": "Acesso apenas para criadores.",
    "Required fields are missing.": "Campos obrigatórios não preenchidos.",
    "Number of candidates must be 4, 8, 16, or 32.": "O número de candidatos deve ser 4, 8, 16 ou 32.",
    "Failed to generate tournament code.": "Erro ao gerar código do torneio.",
    "Tournament not found.": "Torneio não encontrado.",
    "Access denied.": "Acesso negado.",
    "You are no longer a participant in this tournament.": "Você não é mais um participante deste torneio.",
    "This tournament has ended. New participants cannot join.": "Este torneio já foi finalizado. Novos participantes não podem entrar.",
    "Tournament has already started.": "O torneio já foi iniciado.",
    "All participants must submit their picks before starting the tournament.": "Todos os participantes precisam enviar seus palpites antes de iniciar o torneio.",
    "Bracket not found.": "Chaveamento não encontrado.",
    "Invalid candidates list.": "Lista de candidatos inválida.",
    "Candidates list contains duplicates.": "Lista de candidatos contém duplicatas.",
    "Cannot reorder: a participant has already submitted picks.": "Não é possível reordenar: um participante já enviou palpites.",
    "Candidates list does not match tournament.": "A lista de candidatos não corresponde ao torneio.",
    "Participant not found.": "Participante não encontrado.",
    "Cannot kick the tournament creator.": "Não é possível expulsar o criador do torneio.",
    "Match not found.": "Partida não encontrada.",
    "Match already resolved.": "Esta partida já foi resolvida.",
    "Winner is not in this match.": "O vencedor não está nesta partida.",
    "All participants must submit their picks before resolving matches.": "Todos os participantes precisam enviar seus palpites antes de resolver partidas.",
    "This tournament has ended.": "Este torneio já foi finalizado.",
    "Cannot change picks for resolved matches.": "Não é possível alterar palpites de partidas já resolvidas.",
    "Tournament code is required.": "Código do torneio não informado.",
    "Rankings are only available after the tournament starts.": "O ranking está disponível apenas após o início do torneio.",
    "Sign in required.": "É necessário entrar com o Google.",
    "Sign in required to create tournaments.": "É necessário entrar com o Google para criar torneios.",
    "Sign in required to join this tournament.": "É necessário entrar com o Google para entrar neste torneio.",
    "OAuth flow expired or invalid.": "O login com Google expirou. Tente novamente.",
    "Google sign-in failed.": "Falha no login com Google.",
  },
};

export const en: Translations = {
  common: {
    loading: "Loading…",
    networkError: "Network error.",
    cancel: "Cancel",
    confirm: "Confirm",
    home: "Home",
    back: "Back",
    points: "points",
    you: "(you)",
    close: "Close",
    kick: "Kick",
    kicking: "Kicking…",
    kickTitle: "Kick participant",
    kickConfirm: (name) => `Are you sure you want to kick ${name}? This action cannot be undone.`,
    kickParticipantAria: (name) => `Kick ${name}`,
    creator: "creator",
  },
  theme: {
    toggleAria: "Toggle theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  landing: {
    tagline: "Bracket predictions for your team",
    createTournament: "Create tournament",
    orEnterCode: "or enter a code",
    codeCharsHint: "Codes don't use 0, 1, I, or O — hard to distinguish. Use A–Z (except I and O) or 2–9.",
    codeProgress: (current, total) => `${current} / ${total} characters`,
    codeComplete: "Code complete — ready to join!",
    joinTournament: "Join tournament",
    checking: "Checking…",
    tournamentNotFound: (code) => `Tournament "${code}" not found. Check the code and try again.`,
    footer: "Bracket-style tournament · For team activities",
  },
  createTournament: {
    title: "Create tournament",
    subtitle: "Configure the bracket and invite your team.",
    tournamentNameLabel: "Tournament name",
    tournamentNamePlaceholder: "E.g.: World Cup, Oscars 2025…",
    candidatesLabel: "Candidates",
    candidatesHint: "Must have 4, 8, 16 or 32 items. Press Enter to advance, Backspace to remove.",
    itemPlaceholder: (n) => `Item ${n}`,
    addUpTo: (n) => `add up to ${n}`,
    roundThemesLabel: "Round themes",
    roundThemesHint: `What is being competed in each phase? E.g.: "Best flag", "Best cuisine".`,
    final: "Final",
    roundLabel: (n) => `Round ${n}`,
    roundPlaceholders: ["E.g.: Group stage", "E.g.: Quarter-finals", "E.g.: Semi-finals"],
    roundPlaceholderFinal: "E.g.: Grand Final",
    roundPlaceholderDefault: "Phase name",
    creating: "Creating tournament…",
    create: "Create tournament",
    somethingWentWrong: "Something went wrong.",
  },
  lobby: {
    waitingRoom: "Waiting room",
    tournamentCode: "Tournament code",
    copyLink: "Copy link",
    copied: "Copied!",
    participantsSection: "Participants",
    bracketSection: "Bracket",
    items: (n) => `${n} items`,
    joinTitle: "Join tournament",
    joinButton: "Join tournament",
    joining: "Joining…",
    joinFailed: "Failed to join.",
    kickError: "Failed to kick.",
  },
  lobbyCTA: {
    makePicks: "Make picks",
    editPicks: "Edit picks",
    waitingPicksFrom: "Waiting for picks from:",
    readyCount: (ready, total) => `· ${ready} of ${total} ready.`,
    allReady: "All participants have submitted their picks. Ready to start!",
    startTournament: "Start tournament",
    starting: "Starting tournament…",
    waitingCreator: "Waiting for the creator to start the tournament…",
  },
  bracket: {
    waitingRoom: "Waiting room",
    yourPicks: "Your picks",
    fillBracket: "Fill the bracket",
    fromRound: (n) => `Picks — from round ${n}`,
    picksSubmitted: "Picks submitted — follow the live results!",
    viewRanking: "View ranking",
    picksProgress: (picked, eligible) => `${picked} of ${eligible} picks filled`,
    allFilled: "All filled!",
    stillMissing: (n) => `Still missing ${n} picks`,
    sendPicks: "Submit picks",
    editPicks: "Edit picks",
    sending: "Submitting…",
    saving: "Saving…",
    picksSaved: "Picks submitted!",
    saveFailed: "Failed to save.",
    reorderError: "Failed to reorder.",
    reorderNetworkError: "Network error while reordering.",
    dragToReorder: "Drag to reorder",
  },
  live: {
    score: "Score",
    confirmWinner: "Confirm winner",
    confirmWinnerText: (name) =>
      `Are you sure ${name} won this match? This action cannot be undone.`,
    waitingPicksFrom: "Waiting for picks from:",
    picksRequired: "Winners cannot be set until everyone submits their picks.",
    clickWinner: "click the winner",
    match: (n) => `Match ${n}`,
    saving: "Saving…",
    toBeDefined: "TBD",
    bracketSection: "Bracket",
    rankingSection: "Current ranking",
    participantsSection: "Participants",
    winnerError: "Failed to save winner.",
    kickError: "Failed to kick.",
  },
  results: {
    yourScore: "Your score",
    points: "points",
    correct: "Correct",
    played: "Resolved",
    waiting: "Pending",
    rankingSection: "Ranking",
    myPicksSection: "My picks",
    bracketSection: "Bracket",
    won: "won",
    youChose: "You chose:",
    noResults: "No results yet — waiting for the first match.",
    finished: "Finished",
    inProgress: "In progress",
    setWinnersBack: "Set winners",
    myPicksBack: "My picks",
  },
  rankingsTable: {
    rankHeader: "#",
    nameHeader: "Name",
    pointsHeader: "Points",
  },
  bracketView: {
    final: "Final",
    round: (n) => `Round ${n}`,
    tbd: "TBD",
    champion: "Champion",
  },
  auth: {
    signInWithGoogle: "Sign in with Google",
    signOut: "Sign out",
    signInToCreate: "Sign in with Google to create a tournament.",
    signInToJoin: "Sign in with Google to join this tournament.",
    joiningAuto: "Joining tournament…",
    oauthFailed: "Google sign-in failed. Please try again.",
    oauthExpired: "Sign-in expired. Please try again.",
  },
  appHeader: {
    brand: "Chaveio",
    openMenu: "Open menu",
    openSettings: "Open settings",
    accountSection: "Account",
    themeSection: "Theme",
    languageSection: "Language",
  },
  history: {
    title: "My tournaments",
    subtitle: "Tournaments you created or joined",
    noTournaments: "You haven't joined any tournaments yet.",
    creatorBadge: "Creator",
    participantBadge: "Participant",
    statusLobby: "Waiting room",
    statusActive: "In progress",
    statusFinished: "Finished",
    viewTournament: "View tournament",
    participantCount: (n) => `${n} participant${n !== 1 ? "s" : ""}`,
  },
  apiErrors: {},
};

export const translations: Record<Locale, Translations> = { "pt-BR": ptBR, en };
