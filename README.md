# 🌌 NebulaRedraw AI

**NebulaRedraw AI** é um plugin para Adobe Photoshop (versões 2021/2022+) baseado na arquitetura UXP. Ele integra o poder da inteligência artificial generativa do **Google Gemini (Nano Banana / Nano Banana 2)** diretamente no seu fluxo de trabalho, focado especificamente na limpeza (cleaning) e redesenho (redrawing) de Mangás e Webtoons.

## ✨ Funcionalidades

* **Painel UXP Nativo:** Interface minimalista e integrada ao Adobe Photoshop.
* **Seleção Inteligente (Marquee Tool):** Selecione apenas a área do balão de fala ou texto que deseja limpar. O plugin recorta apenas essa área, economizando banda e permitindo o uso em Webtoons gigantes (10.000px+ de altura).
* **Integração com Gemini Vision:** Utiliza a API do Google Gemini para identificar textos/onomatopeias e reconstruir o fundo (screentones, gradientes, cenários) de forma contínua.
* **Merge Down Automático:** A imagem processada é devolvida para o Photoshop exatamente na mesma coordenada da seleção original e mesclada na camada ativa, mantendo seu arquivo organizado.
* **BYOK (Bring Your Own Key):** Insira sua própria API Key do Google AI Studio diretamente nas configurações do painel.

## 🚀 Pré-requisitos

* **Adobe Photoshop** v22.0.0 ou superior (2021, 2022+).
* **Adobe UXP Developer Tool (UDT)** para carregar e empacotar o plugin.
* **Node.js** (para instalar dependências e compilar o React).
* **API Key do Google Gemini** (Gratuita no [Google AI Studio](https://aistudio.google.com/)).

## 🛠️ Como Instalar e Configurar para Desenvolvimento

O código já está 100% integrado com as APIs nativas do Photoshop (`require("photoshop")` e `require("uxp")`). Você só precisa compilar e carregar no UDT.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/nebula-redraw-ai.git
   cd nebula-redraw-ai
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Compile o projeto:**
   ```bash
   npm run build
   ```
   *Isso irá gerar uma pasta `dist/` com os arquivos finais (HTML, JS, CSS).*

4. **Carregue no Adobe UDT:**
   * Abra o Adobe UXP Developer Tool.
   * Clique em **Add Plugin**.
   * Selecione o arquivo `manifest.json` na raiz deste projeto.
   * Clique em **Load** para abrir o painel no seu Photoshop e testar.

## 📦 Empacotamento (Release)

Quando tudo estiver funcionando perfeitamente no seu Photoshop:
1. No Adobe UDT, clique em **Package**.
2. Ele irá gerar um arquivo `.ccx`.
3. Distribua esse arquivo `.ccx` para os usuários finais. Eles só precisam dar um duplo clique para instalar no Photoshop deles.

## 📜 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
