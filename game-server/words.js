/**
 * Banco de Palavras Expandido da Forca Distribuída
 * Contém 225 palavras distribuídas em 9 categorias ricas, classificação de dificuldade e dicas contextualizadas.
 * Todas as palavras são normalizadas em minúsculas e sem acentos [a-z].
 */

function normalizar(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

const listaPalavras = [
  // ==========================================
  // TECNOLOGIA & COMPUTAÇÃO (25)
  // ==========================================
  {
    palavra: normalizar("algoritmo"),
    dica: "Sequência finita e ordenada de instruções lógicas para resolver um problema",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("criptografia"),
    dica: "Arte e técnica de cifrar mensagens para garantir a segurança dos dados",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("microsservico"),
    dica: "Arquitetura de software dividida em serviços modulares e independentes",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("compilador"),
    dica: "Programa que traduz código-fonte em linguagem de máquina executável",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("processador"),
    dica: "Unidade central que realiza os cálculos e executa instruções do computador",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("polimorfismo"),
    dica: "Princípio da programação onde objetos respondem de modos distintos a uma mesma chamada",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("recursividade"),
    dica: "Técnica em que uma função chama a si mesma para resolver subproblemas",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("barramento"),
    dica: "Linha de transmissão de dados entre componentes de um computador",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fibra"),
    dica: "Meio físico de transmissão rápida de dados por pulsos de luz",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("roteador"),
    dica: "Dispositivo que encaminha pacotes de dados entre redes diferentes",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("firewall"),
    dica: "Sistema de segurança que monitora e filtra o tráfego de rede",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("heuristica"),
    dica: "Método prático e intuitivo para encontrar soluções rápidas e aproximadas",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("firmware"),
    dica: "Software básico gravado na memória não volátil de um hardware",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("transpilador"),
    dica: "Ferramenta que converte código de uma linguagem para outra de nível similar",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("virtualizacao"),
    dica: "Criação de versões virtuais de servidores, redes ou sistemas operacionais",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("computacao"),
    dica: "Estudo dos processos computacionais e processamento de informações",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("transistor"),
    dica: "Dispositivo semicondutor que amplifica ou comuta sinais elétricos",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("kernel"),
    dica: "O núcleo central do sistema operacional responsável pela gestão de hardware",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("byte"),
    dica: "Unidade básica de informação digital composta por 8 bits",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("cache"),
    dica: "Memória ultra-rápida usada para armazenar dados acessados com frequência",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("hipervisor"),
    dica: "Camada de software ou hardware que cria e gerencia máquinas virtuais",
    tema: "Tecnologia & Computação",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("backend"),
    dica: "Parte de um sistema que lida com regras de negócio e banco de dados",
    tema: "Tecnologia & Computação",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("protocolo"),
    dica: "Conjunto padronizado de regras para comunicação em rede",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("ciberseguranca"),
    dica: "Prática de proteger computadores, servidores e redes contra invasões",
    tema: "Tecnologia & Computação",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("conteiner"),
    dica: "Pacote leve e autônomo que isola uma aplicação e suas dependências",
    tema: "Tecnologia & Computação",
    dificuldade: "Médio"
  },

  // ==========================================
  // MITOLOGIA & HISTÓRIA (25)
  // ==========================================
  {
    palavra: normalizar("quimera"),
    dica: "Monstro clássico com corpo de cabra, cabeça de leão e cauda de serpente",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("astrolabio"),
    dica: "Antigo instrumento de navegação usado para medir a altitude dos astros",
    tema: "Mitologia & História",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("minotauro"),
    dica: "Criatura lendária com corpo de homem e cabeça de touro que habitava o labirinto",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("valquiria"),
    dica: "Divindade feminina nórdica que conduzia guerreiros heroicos mortos até Valhala",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("sarcofago"),
    dica: "Urna funerária talhada em pedra usada por egípcios e nobres da antiguidade",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("coliseu"),
    dica: "Grandioso anfiteatro em Roma onde ocorriam lutas de gladiadores",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("centauro"),
    dica: "Ser fantástico da mitologia grega metade homem e metade cavalo",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("hieroglifo"),
    dica: "Escrita sagrada baseada em símbolos e pictogramas utilizada no Antigo Egito",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("cuneiforme"),
    dica: "Um dos mais antigos sistemas de escrita conhecidos, feito em tabuletas de argila",
    tema: "Mitologia & História",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("troia"),
    dica: "Cidade lendária da Ásia Menor famosa pelo gigantesco cavalo de madeira",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("leviata"),
    dica: "Monstro marinho mítico e colossal citado em relatos bíblicos e fenícios",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("ouroboros"),
    dica: "Símbolo ancestral que retrata uma serpente devorando a própria cauda",
    tema: "Mitologia & História",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("gladiador"),
    dica: "Combatente armado que lutava em arenas romanas para entretenimento público",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fenix"),
    dica: "Pássaro lendário que entrava em combustão e renascia das próprias cinzas",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("odisseia"),
    dica: "Longa viagem épica cheia de perigos narrada no poema homérico",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("oraculo"),
    dica: "Templo ou sacerdote que recebia e transmitia mensagens e profecias dos deuses",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("berserker"),
    dica: "Furioso guerreiro nórdico que lutava em transe selvagem e destemido",
    tema: "Mitologia & História",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("cleopatra"),
    dica: "Célebre governante e última rainha ativa do Reino Ptolemaico no Egito",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("partenon"),
    dica: "Templo magnífico dedicado a Atena situado no topo da Acrópole de Atenas",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("basilisco"),
    dica: "Serpente lendária cujo olhar petrificava qualquer ser vivente",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("gargula"),
    dica: "Escultura grotesca de pedra usada como calha em catedrais góticas medievais",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("esfinge"),
    dica: "Criatura mítica com corpo de leão que desafiava viajantes com enigmas mortais",
    tema: "Mitologia & História",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("babilonia"),
    dica: "Cidade mesopotâmica lendária por seus jardins suspensos e palácios",
    tema: "Mitologia & História",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("zigure"),
    dica: "Torre em forma de pirâmide escalonada típica da antiga Mesopotâmia",
    tema: "Mitologia & História",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("ragnarok"),
    dica: "Grande batalha escatológica que prenuncia o fim do mundo dos deuses nórdicos",
    tema: "Mitologia & História",
    dificuldade: "Difícil"
  },

  // ==========================================
  // CIÊNCIA & ASTRONOMIA (25)
  // ==========================================
  {
    palavra: normalizar("nebulosa"),
    dica: "Vasta nuvem interestelar de gás e poeira onde se formam novas estrelas",
    tema: "Ciência & Astronomia",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("eletroencefalograma"),
    dica: "Exame neurofisiológico que mapeia as ondas e impulsos elétricos do cérebro",
    tema: "Ciência & Astronomia",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("fotossintese"),
    dica: "Processo vegetal de conversão de energia luminosa solar em matéria orgânica",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("cromossomo"),
    dica: "Estrutura condensada de DNA contendo genes localizada no núcleo da célula",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("supernova"),
    dica: "Explosão estelar colossal e extremamente luminosa que marca o fim de uma estrela massiva",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("exoplaneta"),
    dica: "Mundo rochoso ou gasoso que orbita uma estrela fora do nosso Sistema Solar",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("termodinamica"),
    dica: "Ramo da física focado nas transformações entre calor, trabalho mecânico e energia",
    tema: "Ciência & Astronomia",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("quimiosmose"),
    dica: "Mecanismo bioenergético de síntese de ATP gerado por um gradiente de prótons",
    tema: "Ciência & Astronomia",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("radioatividade"),
    dica: "Emissão espontânea de radiação ou partículas nucleares por átomos instáveis",
    tema: "Ciência & Astronomia",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("foton"),
    dica: "Partícula fundamental quântica que compõe e transporta a luz",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("gravidade"),
    dica: "Força atrativa fundamental que atua entre quaisquer corpos dotados de massa",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("pulsar"),
    dica: "Estrela de nêutrons de rotação ultra-rápida emitindo feixes regulares de radiação",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("mitocondria"),
    dica: "Organela celular responsável pela respiração celular e produção de energia",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("relatividade"),
    dica: "Teoria revolucionária de Einstein que reformulou a compreensão do espaço-tempo",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("espectroscopia"),
    dica: "Técnica científica que investiga a matéria através da radiação emitida ou absorvida",
    tema: "Ciência & Astronomia",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("galaxia"),
    dica: "Sistema maciço formado por bilhões de estrelas, poeira e matéria escura",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("asteroide"),
    dica: "Corpo rochoso menor que um planeta, abundante entre Marte e Júpiter",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("entropia"),
    dica: "Medida física do grau de desordem ou irreversibilidade térmica de um sistema",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fissao"),
    dica: "Divisão do núcleo de um átomo pesado com imensa liberação de energia",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fusao"),
    dica: "Reação termonuclear onde núcleos leves se fundem formando um elemento mais pesado",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("neutron"),
    dica: "Partícula subatômica sem carga elétrica localizada no núcleo atômico",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("quasar"),
    dica: "Núcleo galáctico hiperativo extremamente distante energizado por buraco negro",
    tema: "Ciência & Astronomia",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("sinapse"),
    dica: "Ponto de contato especializado por onde ocorre a transmissão de sinais entre neurônios",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("mutacao"),
    dica: "Modificação espontânea na sequência de bases do DNA de um ser vivo",
    tema: "Ciência & Astronomia",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("magnetismo"),
    dica: "Fenômeno físico de atração e repulsão exercido por ímãs e cargas em movimento",
    tema: "Ciência & Astronomia",
    dificuldade: "Médio"
  },

  // ==========================================
  // FILOSOFIA & ARTE (25)
  // ==========================================
  {
    palavra: normalizar("perspicacia"),
    dica: "Agudeza mental incomum para notar detalhes sutis e compreender com rapidez",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("procrastinacao"),
    dica: "Hábito pernicioso de postergar tarefas importantes para depois",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("metamorfose"),
    dica: "Profunda transformação ou transmutação de forma, aspecto ou caráter",
    tema: "Filosofia & Arte",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("anticonstitucional"),
    dica: "Ato, lei ou princípio que viola frontalmente a Carta Magna",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("cleptomaniaco"),
    dica: "Pessoa acometida por transtorno com impulsos incontroláveis de subtrair coisas",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("estoismo"),
    dica: "Escola filosófica que valoriza serenidade inabalável, virtude e aceitação do destino",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("dialetica"),
    dica: "Método de diálogo e investigação fundado no confronto de ideias opostas",
    tema: "Filosofia & Arte",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("hedonismo"),
    dica: "Doutrina que elege o prazer sensível e a ausência de dor como bem supremo",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("solipsismo"),
    dica: "Concepção filosófica radical de que nada existe com certeza além do próprio eu",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("empirismo"),
    dica: "Corrente filosófica que postula que todo saber provém da experiência sensorial",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("retorica"),
    dica: "Arte clássica da eloquência voltada a persuadir e encantar interlocutores",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("serendipidade"),
    dica: "A feliz e afortunada casualidade de encontrar coisas admiráveis sem procurar",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("epistemologia"),
    dica: "Estudo filosófico dedicado à origem, natureza e limites do conhecimento humano",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("niilismo"),
    dica: "Atitude filosófica cética que nega a existência de valores morais ou sentido intrínseco à vida",
    tema: "Filosofia & Arte",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("hermeneutica"),
    dica: "Ciência e técnica de interpretar textos antigos, leis e manifestações culturais",
    tema: "Filosofia & Arte",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("empatia"),
    dica: "Capacidade psicológica de se colocar verdadeiramente no lugar do outro",
    tema: "Filosofia & Arte",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("etica"),
    dica: "Reflexão sobre os costumes e princípios morais que regem as relações humanas",
    tema: "Filosofia & Arte",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("tautologia"),
    dica: "Vício linguístico de repetir uma afirmação com palavras diferentes sem acrescentar nada",
    tema: "Filosofia & Arte",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("dogma"),
    dica: "Princípio ou ensinamento tido como verdade definitiva e indiscutível",
    tema: "Filosofia & Arte",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("semantica"),
    dica: "Disciplina dos estudos de linguagem voltada à investigação dos significados",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("paradigma"),
    dica: "Conjunto de teorias e padrões amplamente aceito como modelo científico ou cultural",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("utopia"),
    dica: "Visão visionária de uma sociedade perfeitamente justa e harmoniosa porém hipotética",
    tema: "Filosofia & Arte",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("paradoxo"),
    dica: "Afirmação que parece contraditória consigo mesma mas pode revelar verdade profunda",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("melancolia"),
    dica: "Tristeza contemplativa e doce sem motivo evidente que inspira poetas e artistas",
    tema: "Filosofia & Arte",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("anacronismo"),
    dica: "Erro histórico que consiste em atribuir elementos modernos a épocas passadas",
    tema: "Filosofia & Arte",
    dificuldade: "Difícil"
  },

  // ==========================================
  // OBJETOS & FERRAMENTAS (25)
  // ==========================================
  {
    palavra: normalizar("caleidoscopio"),
    dica: "Tubo cilíndrico com pequenos espelhos que cria desenhos simétricos multicor",
    tema: "Objetos",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("paralelepipedo"),
    dica: "Bloco regular de pedra muito utilizado em calçamentos tradicionais",
    tema: "Objetos",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("ampulheta"),
    dica: "Dispositivo de vidro com areia fina usado antigamente para cronometrar horas",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("estroboscopio"),
    dica: "Aparelho óptico emissor de pulsos de luz rápidos para analisar rotações",
    tema: "Objetos",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("termometro"),
    dica: "Aparelho dotado de escala numérica usado para indicar variações de temperatura",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("compasso"),
    dica: "Ferramenta de duas hastes móveis usada para desenhar arcos e circunferências",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("barometro"),
    dica: "Instrumento meteorológico usado para registrar a pressão do ar atmosférico",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("monoculo"),
    dica: "Lente única circular segurada pelos músculos orbitais faciais",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("microscopio"),
    dica: "Equipamento com lentes amplificadoras para visualizar células e bactérias",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("telescopio"),
    dica: "Instrumento óptico tubular voltado à observação de astros e galáxias remotas",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("dinamometro"),
    dica: "Aparelho dotado de mola calibrada para mensurar forças mecânicas e peso",
    tema: "Objetos",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("periscopio"),
    dica: "Tubo dotado de prismas com o qual submarinos observam a superfície do mar",
    tema: "Objetos",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("sismografo"),
    dica: "Sensor altamente sensível que grava oscilações do solo e tremores sísmicos",
    tema: "Objetos",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("giroscopio"),
    dica: "Disco rotativo que preserva sua orientação angular usado em bússolas e aviões",
    tema: "Objetos",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("ferradura"),
    dica: "Peça curvada em forma de arco de ferro cravada sob as patas de cavalos",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("bigorna"),
    dica: "Bloco maciço metálico sobre o qual o ferreiro apoia e forja ferros em brasa",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("chaveiro"),
    dica: "Acessório prático com argola usado para agrupar e carregar chaves",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("lanterna"),
    dica: "Dispositivo luminoso móvel alimentado por pilha para clarear ambientes escuros",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("dobradica"),
    dica: "Peça metálica articulada em eixo que suporta e permite o giro de portas",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fechadura"),
    dica: "Dispositivo de segurança instalado em portas destrancado por chave ou código",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("candelabro"),
    dica: "Lustre ou castiçal refinado provido de vários braços para velas acesas",
    tema: "Objetos",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("alavanca"),
    dica: "Barra firme articulada em um ponto de apoio usada para levantar grandes cargas",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("grampeador"),
    dica: "Aparelho mecânico de escritório utilizado para juntar papéis com grampos",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("alicate"),
    dica: "Ferramenta de ferro articulada usada para segurar, torcer ou cortar condutores",
    tema: "Objetos",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("macarico"),
    dica: "Aparelho portátil que produz chama estreita de alto calor para cortar ou soldar",
    tema: "Objetos",
    dificuldade: "Médio"
  },

  // ==========================================
  // ANIMAIS (25)
  // ==========================================
  {
    palavra: normalizar("ornitorrinco"),
    dica: "Mamífero australiano semiaquático provido de bico de pato que põe ovos",
    tema: "Animais",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("camaleao"),
    dica: "Réptil célebre pela capacidade de mudar a coloração da pele e mover olhos avulsos",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("quati"),
    dica: "Mamífero de focinho comprido e rabo listrado muito curioso nas matas",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("salamandra"),
    dica: "Anfíbio de rabo comprido famoso por regenerar partes do próprio corpo",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("equidna"),
    dica: "Mamífero oceânico singular coberto de espinhos que também põe ovos",
    tema: "Animais",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("axolote"),
    dica: "Curioso anfíbio mexicano aquático de guelras externas que retém a forma larval",
    tema: "Animais",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("pangolim"),
    dica: "Mamífero de escamas endurecidas de queratina que se enrola como uma bola para defesa",
    tema: "Animais",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("tamandua"),
    dica: "Mamífero nativo das Américas desdentado e com língua longa caçador de formigas",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("polvo"),
    dica: "Molusco invertebrado aquático inteligente com três corações e oito tentáculos",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("mariposa"),
    dica: "Inseto voador noturno de asas abertas estreitamente aparentado às borboletas",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("capivara"),
    dica: "O maior roedor existente na natureza, típico das várzeas e rios sul-americanos",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("dromedario"),
    dica: "Ruminante de zonas desérticas com pelagem densa provido de uma só corcova",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("escorpiao"),
    dica: "Aracnídeo perigoso com garras frontais e cauda articulada terminada em ferrão",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("aguia"),
    dica: "Majestosa ave de rapina célebre por sua visão telescópica e garras afiadas",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("lula"),
    dica: "Cefalópode marinho veloz de corpo esguio e dez tentáculos que espirra tinta",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("baiacu"),
    dica: "Peixe que infla o próprio corpo tornando-se uma esfera espinhosa sob ameaça",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("hipopotamo"),
    dica: "Mamífero africano semiaquático volumoso e territorial dotado de mordida potente",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("guepardo"),
    dica: "O mais veloz velocista terrestre do reino animal habitante das savanas",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("narval"),
    dica: "Cetáceo ártico cujo dente canino longo e espiralado parece chifre de unicórnio",
    tema: "Animais",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("coiote"),
    dica: "Canídeo selvagem americano versátil e menor que o lobo",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("tarantula"),
    dica: "Grande aranha peluda caçadora de hábitos noturnos",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("suricato"),
    dica: "Pequeno mamífero do deserto que fica ereto em sentinela para alertar o grupo",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("tubarao"),
    dica: "Predador oceânico temível de esqueleto formado unicamente de cartilagem",
    tema: "Animais",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("lemure"),
    dica: "Primata ágil de olhos grandes endêmico da ilha de Madagascar",
    tema: "Animais",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("falcao"),
    dica: "Ave predadora de mergulhos aéreos vertiginosos para capturar presas",
    tema: "Animais",
    dificuldade: "Fácil"
  },

  // ==========================================
  // NATUREZA (25)
  // ==========================================
  {
    palavra: normalizar("yucca"),
    dica: "Arbusto perene de folhas longas e pontiagudas e flores brancas, comum em climas áridos",
    tema: "Natureza",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("manguezal"),
    dica: "Ecossistema costeiro de transição com árvores de raízes aéreas adaptadas à maré",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("baoba"),
    dica: "Árvore monumental africana de tronco colossal capaz de reter toneladas de água",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("tundra"),
    dica: "Bioma polar de solo permanentemente congelado e vegetação rasteira",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("sequoia"),
    dica: "Árvore colossal da América do Norte que alcança quase cem metros de altura",
    tema: "Natureza",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("estalactite"),
    dica: "Formação cônica pontiaguda de calcário suspensa no teto de grutas",
    tema: "Natureza",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("estalagmite"),
    dica: "Pilar mineral que cresce do chão de cavernas pelo gotejamento de água rica em sais",
    tema: "Natureza",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("penhasco"),
    dica: "Formação rochosa íngreme e vertical cortada à beira de mares ou abismos",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("arquipelago"),
    dica: "Conjunto disperso de ilhas agrupadas em uma mesma bacia marítima",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("geiser"),
    dica: "Fonte hidrotermal que dispara jatos intermitentes de água fervente e vapor",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("geleira"),
    dica: "Massa monumental de gelo denso em constante deslocamento vagaroso",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("desfiladeiro"),
    dica: "Garganta estreita e profunda cercada por escarpas montanhosas verticais",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("savana"),
    dica: "Bioma tropical aberto marcado por vegetação rasteira e árvores espaçadas",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("ravina"),
    dica: "Profunda fissura escavada no relevo pela ação torrencial de enxurradas",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("restinga"),
    dica: "Cordão de vegetação típica litorânea que fixa e protege dunas de areia",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("atol"),
    dica: "Ilha de coral oceânica de formato anular com uma lagoa serena no meio",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("meandro"),
    dica: "Volta ou curva sinuosa acentuada descrita pelas águas de um rio em planícies",
    tema: "Natureza",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("escarpa"),
    dica: "Declive íngreme que delimita o término de platôs ou terrenos elevados",
    tema: "Natureza",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("orquidea"),
    dica: "Planta nobre com flores de formas exuberantes e complexas",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("carnivora"),
    dica: "Planta especializada em atrair e dissolver insetos para suprir nutrientes",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("cacto"),
    dica: "Planta suculenta de climas áridos cujas folhas evoluíram para espinhos",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("taiga"),
    dica: "Floresta boreal de coníferas presente no cinturão frio do hemisfério norte",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("duna"),
    dica: "Monte de areia transportado e remodelado pela ação ininterrupta dos ventos",
    tema: "Natureza",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("permafrost"),
    dica: "Subsolo permanentemente congelado das tundras e regiões polares",
    tema: "Natureza",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("cenote"),
    dica: "Poço natural cristalino formado em rochas calcárias comum em Yucatán",
    tema: "Natureza",
    dificuldade: "Difícil"
  },

  // ==========================================
  // CULINÁRIA MUNDIAL (25)
  // ==========================================
  {
    palavra: normalizar("guacamole"),
    dica: "Típico molho mexicano cremoso feito à base de abacate amassado, limão e temperos",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("croissant"),
    dica: "Pãozinho folhado francês em formato de meia-lua amanteigado e crocante",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("risoto"),
    dica: "Prato italiano clássico de arroz cozido lentamente em caldo aromático com queijo",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("paella"),
    dica: "Tradicional prato espanhol de arroz com açafrão, frutos do mar e carnes",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("sushi"),
    dica: "Prato japonês delicado de arroz temperado combinado com peixe cru ou algas",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("ceviche"),
    dica: "Prato peruano refrescante de peixe cru marinado em suco de limão e pimentas",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("goulash"),
    dica: "Ensopado substancioso e condimentado com páprica típico da culinária húngara",
    tema: "Culinária Mundial",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("brigadeiro"),
    dica: "Doce brasileiro de festa feito de leite condensado, cacau e granulado",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("tempura"),
    dica: "Legumes ou frutos do mar envoltos em massa finíssima fritos em óleo quente",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("ratatouille"),
    dica: "Prato tradicional da culinária francesa de legumes ensopados com azeite e ervas",
    tema: "Culinária Mundial",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("moqueca"),
    dica: "Cozido aromático brasileiro de peixe, azeite de dendê e leite de coco",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("falafel"),
    dica: "Bolinho frito crocante feito de grão-de-bico condimentado popular no Oriente Médio",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("fondue"),
    dica: "Prato suíço comunitário de queijo derretido onde se mergulham cubos de pão",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("quiche"),
    dica: "Torta aberta de massa quebradiça assada com creme de ovos e queijo",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("chimichurri"),
    dica: "Molho aromático argentino à base de ervas, alho e azeite servido com churrasco",
    tema: "Culinária Mundial",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("carpaccio"),
    dica: "Fatias ultrafinas de carne bovina crua temperadas com molho e queijo",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("bacalhau"),
    dica: "Peixe seco e curado no sal muito prestigiado nas receitas portuguesas",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("gyoza"),
    dica: "Pastelzinho recheado típico asiático tostado e cozido no vapor",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("tabule"),
    dica: "Salada refrescante levantina com triguilho, hortelã, salsa e tomate picado",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("feijoada"),
    dica: "Prato nacional brasileiro de feijão preto com diversas carnes e embutidos",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("acaraje"),
    dica: "Bolinho afro-brasileiro da Bahia feito de feijão-fradinho frito no dendê",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("tiramisu"),
    dica: "Sobremesa italiana em camadas com biscoito embebido em café e queijo mascarpone",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("estrogonofe"),
    dica: "Prato com iscas de carne ou frango envolvidas em molho cremoso com cogumelos",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("bruschetta"),
    dica: "Torrada rústica italiana aromatizada com alho e coberta por tomates e manjericão",
    tema: "Culinária Mundial",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("especiaria"),
    dica: "Substância vegetal perfumada usada na gastronomia para realçar sabores e preservar",
    tema: "Culinária Mundial",
    dificuldade: "Fácil"
  },

  // ==========================================
  // ESPORTES (25)
  // ==========================================
  {
    palavra: normalizar("esgrima"),
    dica: "Esporte clássico de combate com armas brancas como florete, espada e sabre",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("heptatlo"),
    dica: "Modalidade combinada feminina de atletismo que reúne sete provas distintas",
    tema: "Esportes",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("decatlo"),
    dica: "Desafio supremo do atletismo composto por dez provas de pista e campo",
    tema: "Esportes",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("maratona"),
    dica: "Histórica corrida de resistência a pé com percurso oficial de 42,195 km",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("taekwondo"),
    dica: "Arte marcial olímpica de origem coreana célebre pela agilidade e altura de seus chutes",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("canoagem"),
    dica: "Esporte náutico de velocidade e controle em caiaques com remos duplos",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("paraquedismo"),
    dica: "Esporte radical com saltos aéreos em queda livre seguidos por abertura de velame",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("poloaquatico"),
    dica: "Jogo de bola em piscina profunda onde times disputam gols usando apenas uma das mãos",
    tema: "Esportes",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("bobsled"),
    dica: "Esporte de inverno que consiste em descer calhas sinuosas de gelo em um trenó veloz",
    tema: "Esportes",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("judo"),
    dica: "Arte marcial japonesa fundada em desequilíbrios, projeções e chaves articulares",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("alpinismo"),
    dica: "Ascensão de paredes íngremes e cumes rochosos com cordas e mosquetões",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("hipismo"),
    dica: "Competição equestre que abrange salto de obstáculos e adestramento refinado",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("triatlo"),
    dica: "Competição contínua que combina natação, ciclismo e corrida sequencialmente",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("basquete"),
    dica: "Jogo veloz onde duas equipes pontuam arremessando a bola dentro de aros elevados",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("handebol"),
    dica: "Jogo de quadra no qual a bola é lançada e passada exclusivamente com as mãos",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("badminton"),
    dica: "Esporte ágil com raquetes leves onde se rebate uma peteca por cima de uma rede alta",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("esqui"),
    dica: "Deslize sobre colinas de neve auxiliado por bastões e duas pranchas presas às botas",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("snowboard"),
    dica: "Descida de encostas cobertas de neve mantendo ambos os pés fixos em uma única prancha",
    tema: "Esportes",
    dificuldade: "Difícil"
  },
  {
    palavra: normalizar("halterofilismo"),
    dica: "Levantamento de barra olímpica com pesos em discos em movimentos como arranque e arremesso",
    tema: "Esportes",
    dificuldade: "Expert"
  },
  {
    palavra: normalizar("ginastica"),
    dica: "Modalidade acrobática de alta flexibilidade, força e equilíbrio corporal",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("remo"),
    dica: "Propulsão e corrida com barcos esguios sobre a água utilizando pás compridas",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("beisebol"),
    dica: "Esporte tradicional em que rebatedores buscam percorrer as quatro bases do campo",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("vela"),
    dica: "Regata de embarcações manobradas pela força dos ventos em oceanos ou lagos",
    tema: "Esportes",
    dificuldade: "Fácil"
  },
  {
    palavra: normalizar("patinacao"),
    dica: "Deslocamento e acrobacias sobre sapatos equipados com rodas ou lâminas de gelo",
    tema: "Esportes",
    dificuldade: "Médio"
  },
  {
    palavra: normalizar("atletismo"),
    dica: "Conjunto primoroso de modalidades esportivas com corridas, saltos e arremessos",
    tema: "Esportes",
    dificuldade: "Fácil"
  }
];

module.exports = listaPalavras;
