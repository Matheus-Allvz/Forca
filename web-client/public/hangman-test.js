const partesDaForca = [
  "cabeca",
  "tronco",
  "braco-direito",
  "braco-esquerdo",
  "perna-direita",
  "perna-esquerda"
];

const faixa = document.querySelector("#hangman-test-range");
const rotuloAtual = document.querySelector("#hangman-test-current");
const legenda = document.querySelector("#hangman-test-caption");
const botoes = document.querySelector("#hangman-test-buttons");

function renderizarPartes(totalErros) {
  const visiveis = new Set(partesDaForca.slice(0, totalErros));
  document.querySelectorAll(".part").forEach((elemento) => {
    elemento.classList.toggle("visible", visiveis.has(elemento.dataset.part));
  });

  if (rotuloAtual) {
    rotuloAtual.textContent = `${totalErros} / 6 erros`;
  }
  if (legenda) {
    legenda.textContent = `Erros visiveis: ${totalErros}/6`;
  }

  document.querySelectorAll("[data-errors]").forEach((botao) => {
    botao.classList.toggle("active-state", Number(botao.dataset.errors) === totalErros);
  });
}

function criarBotoes() {
  if (!botoes) {
    return;
  }

  botoes.innerHTML = "";
  for (let erros = 0; erros <= 6; erros += 1) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "secondary-button";
    botao.dataset.errors = String(erros);
    botao.textContent = String(erros);
    botao.addEventListener("click", () => {
      faixa.value = String(erros);
      renderizarPartes(erros);
    });
    botoes.appendChild(botao);
  }
}

faixa?.addEventListener("input", () => {
  renderizarPartes(Number(faixa.value));
});

criarBotoes();
renderizarPartes(Number(faixa?.value || 0));
