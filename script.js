const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const TOKEN = process.env.FIGMA_API_TOKEN;
const FILE_KEY = "no8EhT73zJVrfUuXMgy85F";

const getFileContents = async () => {
    const { data } = await axios.get(
      `https://api.figma.com/v1/files/${FILE_KEY}`,
      {
        headers: {
          "X-Figma-Token": TOKEN,
        },
      }
    );
    //   console.log(data)
    return data;
  };

const createBuild = () => {
  if (!fs.existsSync("build/")) {
    fs.mkdirSync("build");
  }
};

const writeToFile = (file, contents) => {
  createBuild();
  fs.writeFileSync(`./build/${file}`, contents);
};

//   const createColorsScss = (colors) => writeToFile("_colors_file.scss", colors);
const createStyles = (styles) => writeToFile("_styles_file.scss", styles);

function rgbToHex(r, g, b) {
  const componentToHex = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const hexR = componentToHex(Math.round(r * 255));
  const hexG = componentToHex(Math.round(g * 255));
  const hexB = componentToHex(Math.round(b * 255));

  return `#${hexR}${hexG}${hexB}`;
}

function generateCSSFromJSON(json) {
  const { document } = json;

  function sanitizeClassName(name) {
    return name.replace(/\s+/g, "_");
  }

  function processFillsOrStrokes(array, css, property) {
    array.forEach((item) => {
      if (item.visible === false) {
        return; // Skip invisible fills or strokes
      }
      if (item.type === "SOLID") {
        const hexColor = rgbToHex(item.color.r, item.color.g, item.color.b);
        css += `  ${property}: ${hexColor};\n`;
      }
      if (item.blendMode) {
        css += `  mix-blend-mode: ${item.blendMode.toLowerCase()};\n`;
      }
    });
    return css;
  }

  function traverseLayers(layers, css) {
    layers.forEach((layer) => {
      const className = sanitizeClassName(layer.name);

      if (layer.type === "CANVAS" || layer.type === "FRAME") {
        css += `.${className} {\n`;
        if (layer.scrollBehavior) {
          css += `  scroll-behavior: ${layer.scrollBehavior.toLowerCase()};\n`;
        }
        if (layer.background) {
          css = processFillsOrStrokes(layer.background, css, "background-color");
        }
        css = traverseLayers(layer.children, css);
        css += `}\n\n`;
      } else if (layer.type === "TEXT") {
        css += `.${className} {\n`;
        if (layer.fills) {
          css = processFillsOrStrokes(layer.fills, css, "color");
        }
        css += `  font-family: "${layer.style.fontPostScriptName}";\n`;
        css += `  font-size: ${layer.style.fontSize}px;\n`;
        css += `  font-weight: ${layer.style.fontWeight};\n`;
        css += `  text-align: ${layer.style.textAlignHorizontal.toLowerCase()};\n`;
        if (layer.paddingTop !== undefined && layer.paddingRight !== undefined && layer.paddingBottom !== undefined && layer.paddingLeft !== undefined) {
          css += `  padding: ${layer.paddingTop}px ${layer.paddingRight}px ${layer.paddingBottom}px ${layer.paddingLeft}px;\n`;
        }
        if (layer.background) {
          css = processFillsOrStrokes(layer.background, css, "background-color");
        }
        if (layer.absoluteBoundingBox) {
          const { x, y, width, height } = layer.absoluteBoundingBox;
          css += `  position: absolute;\n`;
          css += `  left: ${x}px;\n`;
          css += `  top: ${y}px;\n`;
          css += `  width: ${width}px;\n`;
          css += `  height: ${height}px;\n`;
        }
        css += `}\n\n`;
      }
    });

    return css;
  }

  let css = "";
  css = traverseLayers(document.children, css);

  // Remove absoluteRenderBounds properties from the CSS string
  css = css.replace(/(\n\s+)(left|top|width|height): \d+px;/g, "");

  return css;
}

//   const generatedCSS = generateCSSFromJSON(figmaData);
//   console.log(generatedCSS);

(async () => {
  const data = await getFileContents();
  const str = generateCSSFromJSON(data);
  // createColorsScss(_scssDump.join("\n"));
  // createStylesScss(_styles);
  createStyles(str);
})();
