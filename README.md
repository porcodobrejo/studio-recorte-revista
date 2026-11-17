# ✂️ Studio Recorte de Revista — Gerador de Letras para Cartolina

Uma aplicação web leve, responsiva (computador e celular) e sem necessidade de instalação de servidor para criar letras no estilo **"recorte de revista" (ransom note / zine)** na medida exata da sua cartolina, prontas para imprimir em folhas **A4** e recortar.

---

## ✨ O que este sistema faz?

1. **Cálculo proporcional para cartolinas (Modo Auto ou Manual)**
   - Você escolhe o tamanho da sua cartolina (ex.: `50 × 66 cm`, `100 × 70 cm`, `150 × 100 cm` ou qualquer medida personalizada) e até a cor de fundo dela.
   - O sistema calcula automaticamente o tamanho ideal de cada recorte em centímetros para que a sua frase preencha o cartaz com margem segura — ou permite travar a largura e altura manualmente.
2. **Garantia Anti-Vazamento**
   - Cada letra é medida no Canvas 2D (considerando a fonte real, acentos e inclinação) para nunca ultrapassar a caixinha ou a borda do papel.
3. **Design orgânico e artesanal das letras**
   - **Caixinha / Moldura interna:** escolha entre *Nenhuma*, *Pontilhada*, *Tracejada*, *Linha*, *Dupla*, *Etiqueta* (fundo invertido) ou *Sortida* (mistura automática em cada letra).
   - **Letra tortinha:** inclina e desloca levemente a letra (e a caixinha) dentro do próprio recorte, com controle de intensidade.
   - **Textura de papel amassado:** gera vincos, facetas de luz/sombra e fibras simulando papel amassado real, com controle de intensidade.
   - **Bordas rasgadas à mão:** substitui o corte reto por um contorno irregular de papel destacado à mão, exibindo a "alma" branca das fibras do papel na borda.
   - **Retícula de revista, fita crepe e rotação na cartolina:** controles independentes e atalhos rápidos (*✨ Limpo*, *🍂 Orgânico*, *🌀 Caótico*).
   - **Sorteio individual:** toque ou clique sobre qualquer letra na simulação da cartolina para sortear novamente **apenas aquela letra**.
4. **Temas prontos + Extração de cores das suas referências**
   - 4 estilos curados: *Colagem Zine 90s*, *Jornal & Vintage*, *Manchete Tabloide* e *Datilografia & Kraft*.
   - Envie até **10 fotos ou prints** de referência: o sistema extrai automaticamente a paleta de cores dominante e aplica nos seus recortes com contraste de texto automático.
5. **Otimizado para Celular e Computador**
   - Renderização unificada em HTML5 Canvas (60 fps, sem travamentos no celular ao digitar ou ajustar controles).
   - No celular, a prévia da cartolina fica sempre visível no topo (com botão `⤢` para tela cheia) e os controles deslizam suavemente logo abaixo.
6. **Impressão A4 e Exportação em PDF Fiel (WYSIWYG)**
   - Tanto a aba **Folhas A4**, quanto o botão **Imprimir** e o **Baixar PDF** usam o mesmo motor gráfico: o PDF sai com as fontes reais, caixinhas pontilhadas, papel amassado e bordas rasgadas exatamente como na tela.

---

## 🚀 Como usar no seu próprio computador (Passo a Passo)

Você **não precisa instalar Node.js, Python nem nenhum programa técnico**. Basta um navegador moderno (Chrome, Edge, Firefox, Safari ou navegador do celular).

### Opção 1 — Baixando pelo GitHub (Mais fácil para qualquer pessoa)
1. Na página deste repositório no GitHub, clique no botão verde **`<> Code`**.
2. Clique em **`Download ZIP`**.
3. Extraia a pasta `.zip` no seu computador (ou celular).
4. Dê dois cliques no arquivo **`index.html`** (ou em **`studio-recorte-unico.html`** se quiser enviar apenas um único arquivo por WhatsApp/e-mail para alguém).
5. Pronto! O programa abrirá direto no seu navegador.

> 💡 **Observação:** Na primeira vez que abrir, é recomendável estar conectado à internet para que o navegador carregue as fontes artísticas do *Google Fonts* e a biblioteca *jsPDF*.

### Opção 2 — Clonando com Git (Para quem usa Git)
```bash
git clone https://github.com/porcodobrejo/studio-recorte-revista.git
cd studio-recorte-revista
```
Depois, basta abrir o arquivo `index.html` no navegador.

---

## 🖨️ Dica importante na hora de imprimir

Para que cada letra saia no papel com os **centímetros exatos** calculados para a sua cartolina:
- Ao imprimir o PDF (ou usar o botão **Imprimir**), abra as **Mais definições / Configurações de impressão** da sua impressora.
- Em **Escala**, marque **100%** ou **Tamanho real** (desmarque opções como *"Ajustar à página"* ou *"Fit to page"*).

---

## 🗂️ Estrutura dos arquivos (Para futuras atualizações)

O projeto foi organizado de duas formas para facilitar tanto o uso quanto a manutenção:

```text
studio-recorte-revista/
├── index.html                 # Aplicação principal (carrega os arquivos de assets/)
├── studio-recorte-unico.html  # Versão portátil tudo-em-um (HTML + CSS + JS em 1 só arquivo)
├── README.md                  # Este guia de uso e documentação
├── LICENSE                    # Licença MIT (uso livre)
├── .gitignore                 # Arquivos ignorados pelo Git
└── assets/
    ├── css/
    │   └── style.css          # Estilos responsivos (Desktop + Mobile) e regras de impressão A4
    └── js/
        ├── data.js            # Fontes, paletas de cores, frases prontas e valores padrão
        ├── render.js          # Motor Canvas 2D (caixinhas, letra torta, papel amassado e borda rasgada)
        └── app.js             # Estado, eventos da interface, cálculo da cartolina e exportação PDF
```

### Como editar ou adicionar novos estilos no futuro?
- **Adicionar novas fontes, cores ou frases prontas:** edite apenas o arquivo `assets/js/data.js`.
- **Ajustar os efeitos visuais (papel amassado, rasgo, molduras):** edite `assets/js/render.js`.
- **Ajustar botões, layout ou medidas de página A4:** edite `index.html`, `assets/css/style.css` e `assets/js/app.js`.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Você pode usar, estudar, modificar e compartilhar livremente.
