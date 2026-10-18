# Listas por Setores

Site estático (HTML + CSS + JS) para organizar itens por setor. Dados salvos no navegador (localStorage).

## Estrutura
- `index.html` – página
- `css/styles.css` – estilos
- `js/config.js` – setores, unidades, cores e palavras-chave padrão
- `js/storage.js` – salvar, migrar dados antigos, exportar/importar
- `js/render.js` – desenho dos setores e itens
- `js/images.js` – busca de miniatura
- `js/main.js` – eventos e lógica

## Rodar localmente
Módulos JS não funcionam com duplo clique. Use a extensão Live Server (VS Code) ou `python -m http.server`.

## Publicar
GitHub → Settings → Pages → Branch `main`, pasta `/ (root)`.
