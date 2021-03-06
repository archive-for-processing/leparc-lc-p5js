/**
 * lp5-rederer.js
 *
 */

// Global var scope -----------------------------------------
if (!global.hasOwnProperty("lp")) {
    global.lp = {
        snippets: [],
    };
} else {
    console.trace('no se pudo crear el objeto global "lp"');
}
// Init -----------------------------------------------------
window.addEventListener("load", function() {
    // Methods registration
    Lp5.registerMethodToEval("snip");
    Lp5.registerMethodToEval("useLib");
    Lp5.registerMethodToEval("loadLib");
    Lp5.registerMethodToEval("useOSC");
    // OSC ------------------------------------------------
    Lp5.oscLib = require("osc");
    // MIDI -----------------------------------------------
    Lp5.midiLib = require("webmidi");
    Lp5.midiLib.enable(function(err) {
        if (err) {
            console_msg("MIDI error");
            Lp5.midiReady = false;
        } else {
            console_msg("MIDI enabled!");
            Lp5.midiReady = true;
            Lp5.midiInputs = Lp5.midiLib.inputs;
            Lp5.midiOutputs = Lp5.midiLib.outputs;
        }
    });
    // Extends --------------------------------------------
    try {
        require(Lp5.main
            .path()
            .join(
                Lp5.main.resourcesPath(),
                "leparc_resources",
                "extends",
                "lp-extends.js",
            ));
    } catch (e) {
        console.trace("No se pudo cargar lp-extends.js");
    }
    // Get Sys RAM ----------------------------------------
    setInterval(() => {
        // Memoria
        Lp5.el("lp5-os-ram").innerText =
            "| free ram:" + Lp5.main.getMemory() + "%";
    }, 2000);
    // Get loop framerate ---------------------------------
    setInterval(() => {
        // FPS
        let noloop = '<span class="info">NO LOOP</span>';
        let osfps = Math.round(Lp5.fps);
        //
        if (Lp5.playmode == "livecoding") {
            if (!Lp5.looping) {
                Lp5.el("lp5-os-fps").innerHTML = noloop;
            } else {
                Lp5.el("lp5-os-fps").innerHTML = "| fps:" + osfps;
            }
        } else {
            if (!Lp5.looping) {
                Lp5.el("lp5-os-fps").innerHTML = noloop;
            } else {
                Lp5.el("lp5-os-fps").innerHTML = "";
            }
        }
    }, 500);
    Lp5.toggleModal("cnf");
    // Play mode ------------------------------------------
    if (!localStorage.playmode) {
        localStorage.playmode = "livecoding";
        Lp5.el("cnf-playmode").options[0].selected = true;
    }
    if (localStorage.playmode == "livecoding") {
        Lp5.el("cnf-playmode").options[0].selected = true;

        // // Servidor ----------------------------------
        Lp5.serverRq = require("./libs/server.js");
        // // Cliente -----------------------------------
        Lp5.clientRq = require("./libs/client.js");
    }
    if (localStorage.playmode == "static") {
        Lp5.el("cnf-playmode").options[1].selected = true;
        Lp5.el("option-renderonfly").style.display = "none";
        Lp5.el("option-server-mode").style.display = "none";
        Lp5.el("option-server-hidecanvas").style.display = "none";
        Lp5.el("option-server-sync").style.display = "none";
        Lp5.el("option-server-name").style.display = "none";
        Lp5.el("option-render").style.display = "none";
    }
    Lp5.playmode = localStorage.playmode;

    // IP -------------------------------------------------
    Lp5.IP = Lp5.main.getIP();
    // Lang -----------------------------------------------
    if (!localStorage.lang) {
        Lp5.el("cnf-lang").options[1].selected = true;
        localStorage.lang = "en";
    }
    if (localStorage.lang == "es") {
        Lp5.el("cnf-lang").options[0].selected = true;
    }
    if (localStorage.lang == "en") {
        Lp5.el("cnf-lang").options[1].selected = true;
    }
    // Num lineas------------------------------------------
    if (!localStorage.linenumbers) {
        localStorage.linenumbers = 1;
    }
    if (localStorage.linenumbers == 1) {
        Lp5.el("cnf-linenumbers").checked = true;
    } else {
        Lp5.el("cnf-linenumbers").checked = false;
    }
    // Code Helper ------------------------------------------
    if (!localStorage.codehelper) {
        localStorage.codehelper = 0;
    }
    if (localStorage.codehelper == 1) {
        Lp5.el("cnf-codehelper").checked = true;
    } else {
        Lp5.el("cnf-codehelper").checked = false;
    }

    if (Lp5.main.globalSettings().renderer == "webgl") {
        Lp5.el("lp5-os-r").style.display = "inline";
        Lp5.el("cnf-render").options[1].selected = true;
    } else {
        Lp5.el("lp5-os-r").style.display = "none";
        Lp5.el("cnf-render").options[0].selected = true;
    }
    // Theme ----------------------------------------------
    if (!localStorage.theme) {
        localStorage.theme = "default";
        Lp5.el("_theme").href = "libs/codemirror/theme/none.css";
    } else {
        if (localStorage.theme == "default" || localStorage.theme == "") {
            Lp5.el("_theme").href = "libs/codemirror/theme/none.css";
        } else {
            Lp5.el("_theme").href =
                "libs/codemirror/theme/" + localStorage.theme + ".css";
        }
        for (let i = 0; i < Lp5.el("cnf-theme").options.length; i++) {
            if (Lp5.el("cnf-theme").options[i].value == localStorage.theme) {
                Lp5.el("cnf-theme").options[i].selected = true;
                break;
            }
        }
    }
    // ----------------------------------------------------
    // Code mirror ----------------------------------------

    Lp5.cmAux = CodeMirror(Lp5.codeAux, {
        mode: "javascript",
        matchBrackets: true,
        theme: localStorage.theme,
        autoCloseBrackets: true,
        indentUnit: 4,
        lineWrapping: true,
        lineNumbers: localStorage.linenumbers == 1 ? true : false,
        extraKeys: {
            "Ctrl-Space": localStorage.codehelper == 1 ? "autocomplete" : null,
        },
    });
    Lp5.cmAux.on("change", function(cm, ob) {
        if (
            Lp5.renderCodeAux != Lp5.doGlobals("'use strict';" + cm.getValue())
        ) {
            Lp5.historyChangesAux = 1;
            Lp5.el("lp5-aux").parentElement.classList.add("change");
        } else {
            Lp5.el("lp5-aux").parentElement.classList.remove("change");
        }
    });
    // Win Title ------------------------------------------
    let playmode = Lp5.playmode == "static" ? " | STATIC" : "";
    document.title = "LeParc - livecoder - P5js - v" + Lp5.version + playmode;

    // Init cursor ----------------------------------------
    Lp5.pannelFocus("aux");

    // Console clear --------------------------------------
    console.clear();
});
// ********************************************************************
// ********************************************************************
// P5js ***************************************************************
// ********************************************************************
// p5.disableFriendlyErrors = true;
function preload() {
    //
    loadStrings(
        Lp5.main
            .path()
            .join(
                Lp5.main.resourcesPath(),
                "leparc_resources",
                "save",
                "auxcode.txt",
            ),
        (file) => {
            Lp5.auxTxt = file;
            let atxt = "";
            for (let i = 0; i < Lp5.auxTxt.length; i++) {
                atxt += Lp5.auxTxt[i] + "\n";
            }
            try {
                if (atxt != "") {
                    Lp5.cmAux.setValue(Lp5.beautify_js(atxt.trim()));
                    Lp5.pannelFocus("aux");
                } else {
                    Lp5.cmAux.setValue("//");
                }
            } catch (e) {
                console.trace(e);
            }
        },
    );
    // Cargar config / Load config
    loadStrings(
        Lp5.main
            .path()
            .join(
                Lp5.main.resourcesPath(),
                "leparc_resources",
                "config",
                "config.txt",
            ),
        (file) => {
            Lp5.cnfTxt = file;
            for (let i = 0; i < Lp5.cnfTxt.length; i++) {
                let vars = Lp5.cnfTxt[i].split("=");
                if (vars[0] && vars[1])
                    Lp5.configs[vars[0].trim()] = vars[1].trim();
            }

            // Checkea si toma muchos recursos y para el loop
            // Check if takes too much resources and stop loop
            if (Lp5.playmode == "livecoding") {
                let cfps = setInterval(function() {
                    if (
                        getFrameRate() <
                        _targetFrameRate * parseFloat(Lp5.configs["mfr"])
                    ) {
                        noLoop();
                        Lp5.looping = false;
                    }
                }, 2000);
            }
        },
    );
}
// ********************************************************************
// LIVECODING *********************************************************
// ********************************************************************
function setup() {
    let density = displayDensity();
    pixelDensity(density);
    if (Lp5.playmode == "livecoding") {
        // WebGl --------------------------------------------
        // Fix default this.pointSize = 5 ?
        // p5.RendererGL.prototype.strokeWeight = function (w) {
        //       if (this.curStrokeWeight !== 0.0001) {
        //             this.pointSize = w;
        //             this.curStrokeWeight = w;
        //       }
        // };

        // Init setup --------------------------
        if (!Lp5.canvas) {
            Lp5.canvas = createCanvas(
                windowWidth,
                windowHeight,
                Lp5.main.globalSettings().renderer,
            );
        }
        // Webcam/video capture
        if (___webcam) {
            ___webcam.remove();
        }
        ___webcam = null;
        // Audio
        if (___audio != null) {
            ___audio.disconnect();
            ___audio = null;
            ___fft = null;
        }
        resizeCanvas(windowWidth, windowHeight);
        blendMode(BLEND);
        setFrameRate(60);
        imageMode(CORNER);
        angleMode(RADIANS);
        rectMode(CORNER);
        ellipseMode(CENTER);
        colorMode(RGB, 255, 255, 255);
        background(0);
        // Eval -----------------------------------------------------
        try {
            new Function(Lp5.validCodeSetup)();
        } catch (e) {
            console_msg("setup: " + e);
            Lp5.el("lp5-aux").parentElement.classList.add("error");
        }
    }
}
function draw() {
    if (Lp5.playmode == "livecoding") {
        Lp5.startDraw();
        //if (!Lp5.drawOnFly) {
        try {
            new Function(Lp5.validCodeDraw)();
        } catch (e) {
            if (e.type !== "InfiniteLoopError") {
                Lp5.el("lp5-console-out").innerHTML = "draw: " + e;
            }
        }
        // } else {
        //     /**************
        //      * DRAW ON FLY
        //      **************/
        //     if (Lp5.blockData.func == "draw") {
        //         Lp5.renderCodeDraw = Lp5.doGlobals(
        //             "'use strict';" + Lp5.blockData.code,
        //         );
        //     }
        //     Lp5.evalDraw(true);
        // }
    }
}
function mouseMoved() {
    try {
        new Function(Lp5.validCodeEvent.mouseMoved)();
    } catch (e) {
        console_msg("mouseMoved: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function mousePressed() {
    try {
        new Function(Lp5.validCodeEvent.mousePressed)();
    } catch (e) {
        console_msg("mousePressed: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function mouseReleased() {
    try {
        new Function(Lp5.validCodeEvent.mouseReleased)();
    } catch (e) {
        console_msg("mouseReleased: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function mouseClicked() {
    try {
        new Function(Lp5.validCodeEvent.mouseClicked)();
    } catch (e) {
        console_msg("mouseClicked: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function doubleClicked() {
    try {
        new Function(Lp5.validCodeEvent.doubleClicked)();
    } catch (e) {
        console_msg("doubleClicked: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function mouseWheel() {
    try {
        new Function(Lp5.validCodeEvent.mouseWheel)();
    } catch (e) {
        console_msg("mouseWheel: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function keyTyped() {
    try {
        new Function(Lp5.validCodeEvent.keyTyped)();
    } catch (e) {
        console_msg("keyTyped: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function keyPressed() {
    try {
        new Function(Lp5.validCodeEvent.keyPressed)();
    } catch (e) {
        console_msg("keyPressed: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function keyReleased() {
    try {
        new Function(Lp5.validCodeEvent.keyReleased)();
    } catch (e) {
        console_msg("keyReleased: " + e.stack);
        Lp5.el("lp5-aux").parentElement.classList.add("error");
    }
}
function windowResized() {
    if (Lp5.playmode == "livecoding") {
        try {
            resizeCanvas(windowWidth, windowHeight, true);
            // BUFFERS
            for (let i = 0; i < Lp5.numBuffers; i++) {
                if (document.getElementById("bufferId" + i)) {
                    let r = ___BUFFER[i].elt.dataset.render;
                    ___BUFFER[i].remove();
                    useBuffer(i, r);
                }
            }
            // }
            try {
                new Function(Lp5.validCodeSetup)();
            } catch (e) {
                console_msg("resize: " + e.stack);
                //Lp5.el('lp5-setup').parentElement.classList.add('error');
            }
        } catch (e) {
            console.trace("en resize " + e);
        }
    }
}
// ********************************************************************
// ********************************************************************
// ********************************************************************

// -----------------------------------------------------
// EVENTS ----------------------------------------------

Lp5.codeAux.addEventListener("click", (ev) => {
    Lp5.changeBgLineAlpha();
});

Lp5.codeAux.addEventListener("paste", function(ev) {
    // let lng = Lp5.clipboard.split('\n')
    // if (Lp5.selected) {
    //       Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line + (lng.length - 1), ch: Lp5.cmAuxCp.ch })
    // // } else if(Lp5.cmAux.somethingSelected()) {
    // //       console.log('2')
    // //       ev.preventDefault()
    // //       let sel = Lp5.cmAux.getSelection()
    // //       Lp5.cmAux.replaceSelection(Lp5.clipboard)
    // //       Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line + (lng.length - 1), ch: Lp5.cmAuxCp.ch + lng[lng.length - 1].length+sel.length })
    // }else{
    //       Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line + (lng.length - 1), ch: Lp5.cmAuxCp.ch + lng[lng.length - 1].length })
    // }
    // if (Lp5.cmAux.somethingSelected()) {
    //       Lp5.selected = true
    // }else{
    //       Lp5.selected = false
    // }
});
Lp5.codeAux.addEventListener("copy", function(ev) {
    // if (Lp5.cmAux.somethingSelected()) {
    //       Lp5.selected = true
    // }else{
    //       Lp5.selected = false
    // }
    // Lp5.clipboard = ''
    // Lp5.clipboard = ev.srcElement.value
});
Lp5.codeAux.addEventListener("cut", function(ev) {
    // if (Lp5.cmAux.somethingSelected()) {
    //       Lp5.selected = true
    // }else{
    //       Lp5.selected = false
    // }
    // Lp5.clipboard = ''
    // Lp5.clipboard = ev.srcElement.value
});
Lp5.codeAux.addEventListener("mousedown", (ev) => {
    Lp5.changeBgLineAlpha();
    // Obtiene la ultima posicion del cursor
    Lp5.cmAuxCp.line = Lp5.cmAux.getCursor().line;
    Lp5.cmAuxCp.ch = Lp5.cmAux.getCursor().ch;
    Lp5.cmAux.focus();
    // Obtiene los datos del bloque
    Lp5.blockData = Lp5.getCodeBlock(Lp5.cmAux, Lp5.cmAuxCp);

    // On fly use this
    if (Lp5.playmode == "livecoding" && Lp5.drawOnFly) {
        Lp5.evalLivecoding(true);
    }
});
Lp5.codeAux.addEventListener("keyup", (ev) => {
    // Obtiene la ultima posicion del cursor
    Lp5.cmAuxCp.line = Lp5.cmAux.getCursor().line;
    Lp5.cmAuxCp.ch = Lp5.cmAux.getCursor().ch;
    // Obtiene los datos del bloque
    Lp5.blockData = Lp5.getCodeBlock(Lp5.cmAux, Lp5.cmAuxCp);

    // On fly use this
    if (Lp5.playmode == "livecoding" && Lp5.drawOnFly) {
        Lp5.evalLivecoding(true);
    }
});
Lp5.codeAux.addEventListener("keydown", (ev) => {
    // Evalua bloque ---------------------------------------------------
    if (ev.ctrlKey && ev.keyCode == 13) {
        if (Lp5.playmode == "static") {
            Lp5.clearEvts();
            let code = Lp5.cmAux.getValue();
            let lfrom = 0;
            let lto = 0;
            let opens = 0;
            let brackets = false;
            // Get content of draw function -----------------------
            while (lfrom < Lp5.cmAux.lineCount()) {
                if (
                    Lp5.cmAux.getLine(lfrom) != "" &&
                    Lp5.cmAux
                        .getLine(lfrom)
                        .match(/function[\t\s\ ]+draw[\t\s\ ]*\([\t\s\ ]*\)/g)
                ) {
                    break;
                }
                lfrom++;
                lto = lfrom;
            }
            while (lto < Lp5.cmAux.lineCount()) {
                if (Lp5.cmAux.getLine(lto).match(/\{/g)) {
                    brackets = true;
                    opens++;
                }
                if (Lp5.cmAux.getLine(lto).match(/\}/g) && opens > 0) {
                    opens--;
                }
                if (brackets && opens == 0) {
                    break;
                }
                lto++;
            }
            let drawCode = Lp5.cmAux
                .getRange({ line: lfrom, ch: 0 }, { line: lto + 1, ch: 0 })
                .trim()
                .replace(
                    new RegExp(
                        "^function[\\t\\s ]+draw[\\t\\s ]*\\([\\t\\s ]*\\)[\\t\\n\\s ]*\\{",
                        "g",
                    ),
                    "\ndraw = function(){\ntry{\n",
                )
                .replace(
                    new RegExp("\\}$", "g"),
                    "\n}catch(e){\nnoLoop();\nconsole.log(e);\nLp5.el('lp5-console-out').innerHTML = e;\nLp5.el('lp5-aux').parentElement.classList.add('error');}}",
                );

            // -----------------------------------------------------------------
            // For [function name()] -> [name = function()]
            for (let i = 0; i < Lp5.p5Words.length; i++) {
                let word = Lp5.p5Words[i];
                let exp = new RegExp(
                    "function[\\t\\s ]+" + word + "[\\t\\s ]*\\([\\t\\s ]*\\)",
                    "g",
                );
                // draw -> will replaced / se reemplaza -> [_________draw function()]
                if (word == "draw") word = "let _________draw";
                code = code.replace(exp, word + " = function()");
            }
            // se crea draw function() / create draw function()
            code = code + drawCode;
            // si están declaradas / if are declared
            if (code.match(/[ ]*preload[\t ]*\=/g)) code = code + ";preload()";
            if (code.match(/[ ]*setup[\t ]*\=/g)) code = code + ";setup()";
            if (code.match(/[ ]*draw[\t ]*\=/g)) code = code + ";draw()";
            // Eval
            Lp5.renderCodeAux = "'use strict';" + code;
            Lp5.evalAll();
            Lp5.evalFx("lp5-aux");
            // Si se detiene el loop principal y estaba loopeando
            // if main loop stopped on error and was looping
            if (Lp5.looping) loop();
        }
        if (Lp5.playmode == "livecoding") {
            Lp5.evalLivecoding(false);
        }
    }
    if (!ev.ctrlKey && !ev.shiftKey && ev.altKey && ev.keyCode == 13) {
        ev.preventDefault();
        if (Lp5.playmode == "livecoding") {
            Lp5.blockData = Lp5.getCodeLines(Lp5.cmAux, Lp5.cmAuxCp);
            Lp5.evalLivecoding(false);
        }
    }
    if (ev.ctrlKey && ev.keyCode == 70) {
        ev.preventDefault();
        // Si hay cambios -> formatea
        try {
            Lp5.cmAux.setValue(Lp5.beautify_js(Lp5.cmAux.getValue()));
            Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line });
        } catch (e) {
            console.trace(e);
        }
    }
});
// SHADERS ---------------------------------------------
// Lp5.codeFrag.addEventListener('keydown', (ev) => {
//       // Evalua bloque ---------------------------------------------------
//       if (ev.ctrlKey && ev.keyCode == 13) {
//             Lp5.renderCodeFrag = Lp5.cmFrag.getValue()
//             Lp5.evalFx('lp5-frag')

//             try {
//                   ___createShader()
//                   shader(___shader)
//             } catch (e) {
//                   Lp5.el('lp5-console-out').innerHTML = 'frag: ' + e
//                   Lp5.el('lp5-frag').parentElement.classList.remove('error');
//             }
//       }
// })
// Lp5.codeVert.addEventListener('keydown', (ev) => {
//       // Evalua bloque ---------------------------------------------------
//       if (ev.ctrlKey && ev.keyCode == 13) {
//             Lp5.renderCodeVert = Lp5.cmVert.getValue()
//             Lp5.evalFx('lp5-vert')
//             try {
//                   ___createShader()
//                   shader(___shader)
//             } catch (e) {
//                   Lp5.el('lp5-console-out').innerHTML = 'vert: ' + e
//                   Lp5.el('lp5-vert').parentElement.classList.remove('error');
//             }
//       }
// })
// -----------------------------------------------------
// -----------------------------------------------------
// Global keyup event ----------------------------------

// document.addEventListener('click', (ev) => {
//       if (Lp5.cmAux.hasFocus()) Lp5.cmFocused = 'aux'
//       if (Lp5.cmVert.hasFocus()) Lp5.cmFocused = 'vert'
//       if (Lp5.cmFrag.hasFocus()) Lp5.cmFocused = 'frag'
//       //
//       console.log(Lp5.cmFocused)
// })

document.addEventListener("keyup", (ev) => {
    if (ev.ctrlKey && ev.keyCode == 90) {
        ev.preventDefault();
        return false;
    }
    // Fullscreen ----------------------------
    if (ev.keyCode == 122) {
        if (!Lp5.fullscreen) {
            Lp5.main.setFull();
            Lp5.fullscreen = true;
        } else {
            Lp5.main.setUnFull();
            Lp5.fullscreen = false;
        }
    }
    // Chrome Devtools ----------------------------
    if (ev.keyCode == 121) {
        if (!Lp5.devtools) {
            Lp5.main.devTools(true);
            Lp5.devtools = true;
            console.clear();
        } else {
            Lp5.main.devTools(false);
            Lp5.devtools = false;
        }
    }
    // Recargar / Reload
    if (ev.keyCode == 116) {
        Lp5.main.reload();
    }
    // Mostrar / ocultar codigo
    // Show / hide editor
    if (ev.ctrlKey && ev.keyCode == 72) {
        if (Lp5.showWin) {
            Lp5.el("win").style.display = "none";
            Lp5.showWin = false;
        } else {
            Lp5.el("win").style.display = "block";
            Lp5.showWin = true;
        }
    }
    // Exit
    if (ev.keyCode == 27) {
        if (confirm(lang_msg.exit_app)) {
            Lp5.main.exit();
        }
    }
    Lp5.changeBgLineAlpha();

    // Sockets -------------------------------------
    if (Lp5.playmode == "livecoding" /*&& ev.keyCode != 8 && !ev.shiftKey*/) {
        if (Lp5.mode == "SERVER") {
            Lp5.server.sendClient(frameCount);
        }
        if (Lp5.mode == "CLIENT") {
            Lp5.client.sendServer(ev);
        }
        // Node name
        Lp5.nodeName = Lp5.el("cnf-name").value;
    }
    // if (!ev.ctrlKey && !ev.shiftKey && !ev.altKey && ev.keyCode == 13) {
    //       ev.preventDefault();
    //       try {
    //             Lp5.cmAux.setValue(Lp5.beautify_js(Lp5.cmAux.getValue()))
    //             // Lp5.cmAux.cm.indentLine({line: Lp5.cmAuxCp.line, dir: 'smart'})
    //             Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line })
    //       } catch (e) {
    //             console.trace(e)
    //       }
    // }
});
// Global keydown event -----------------------------------
document.addEventListener("keydown", function(ev) {
    // Comment ----------------------
    if (
        // -> c
        (ev.shiftKey && !ev.altKey && ev.ctrlKey && ev.keyCode == 67) ||
        // -> /
        (ev.shiftKey && !ev.altKey && ev.ctrlKey && ev.keyCode == 55)
    ) {
        ev.preventDefault();
        Lp5.cmAux.toggleComment({
            lineComment: "//",
            indent: true,
        });
    }
    // Format code ----------------------
    if (ev.ctrlKey && ev.keyCode == 70) {
        ev.preventDefault();
        // Si hay cambios -> formatea
        try {
            Lp5.cmAux.setValue(Lp5.beautify_js(Lp5.cmAux.getValue()));
            Lp5.cmAux.setCursor({ line: Lp5.cmAuxCp.line });
        } catch (e) {
            console.trace(e);
        }
    }
    // ----------------------------------
    // Config win -----------------------
    if (ev.ctrlKey && ev.keyCode == 9) {
        ev.preventDefault();
        Lp5.toggleModal("cnf");
    }
    // Panic Loop --------------------
    // Ctrl+L
    if (ev.ctrlKey && ev.keyCode == 76) {
        if (Lp5.looping) {
            noLoop();
            Lp5.looping = false;
        } else {
            loop();
            Lp5.looping = true;
        }
    }
    // Salvar codigo --------------------
    // Save code
    if (ev.ctrlKey && ev.keyCode == 83) {
        Lp5.main.saveCode("auxcode", Lp5.cmAux.getValue());
        Lp5.historyChangesAux = 0;
        console_msg(lang_msg.saved);
    }
    if (ev.ctrlKey && ev.keyCode == 90) {
        ev.preventDefault();
        return false;
    }
    // Refrescar fondo lineas
    Lp5.changeBgLineAlpha();

    // Sockets -------------------------------------
    // if (Lp5.playmode == 'livecoding' /*&& ev.keyCode == 8 && !ev.shiftKey*/) {
    //       if (Lp5.mode == 'SERVER') {
    //             Lp5.server.sendClient(frameCount)
    //       }
    //       if (Lp5.mode == 'CLIENT') {
    //             Lp5.client.sendServer(ev)
    //       }
    //       // Node name
    //       Lp5.nodeName = Lp5.el('cnf-name').value
    // }

    // Config options --------------------

    // AUTORENDER ------------------------
    if (
        Lp5.playmode == "livecoding" &&
        !ev.altKey &&
        ev.shiftKey &&
        ev.ctrlKey &&
        ev.keyCode == 65
    ) {
        ev.preventDefault();
        if (Lp5.el("cnf-renderonfly").checked) {
            Lp5.el("cnf-renderonfly").checked = false;
            Lp5.el("lp5-lp-ar").innerHTML = "";
            Lp5.drawOnFly = false;
        } else {
            Lp5.el("cnf-renderonfly").checked = true;
            Lp5.drawOnFly = true;
            Lp5.el("lp5-lp-ar").innerHTML = " | <span>AR</span>";
        }
    }
    // LINE NUMBERS ------------------------
    if (!ev.altKey && !ev.shiftKey && ev.ctrlKey && ev.keyCode == 78) {
        ev.preventDefault();
        if (Lp5.el("cnf-linenumbers").checked) {
            Lp5.el("cnf-linenumbers").checked = false;
            localStorage.linenumbers = 0;
            Lp5.cmAux.setOption("lineNumbers", false);
        } else {
            Lp5.el("cnf-linenumbers").checked = true;
            localStorage.linenumbers = 1;
            Lp5.cmAux.setOption("lineNumbers", true);
        }
    }
    // Incrase font size
    if (ev.ctrlKey && (ev.keyCode == 107 || ev.keyCode == 187)) {
        ev.preventDefault();
        Lp5.scale_st += 0.1;
        Lp5.codeAux.style.fontSize = Lp5.scale_st + "rem";
        Lp5.codeAux.style.lineHeight = Lp5.scale_st * 1.7 + "rem";
        Lp5.cmAux.refresh();
    }
    // Decrase font size
    if (ev.ctrlKey && (ev.keyCode == 109 || ev.keyCode == 189)) {
        ev.preventDefault();
        Lp5.scale_st -= 0.1;
        if (Lp5.scale_st < 0.5) {
            Lp5.scale_st = 0.5;
        }
        Lp5.codeAux.style.fontSize = Lp5.scale_st + "rem";
        Lp5.codeAux.style.lineHeight = Lp5.scale_st * 1.7 + "rem";
        Lp5.cmAux.refresh();
    }
    // Incrase background alpha
    if (ev.altKey && (ev.keyCode == 107 || ev.keyCode == 187)) {
        ev.preventDefault();
        Lp5.bg_code_alpha += 0.05;
        if (Lp5.bg_code_alpha > 1.0) {
            Lp5.bg_code_alpha = 1.0;
        }
        Lp5.changeBgLineAlpha();
    }
    // Decrase background alpha
    if (ev.altKey && (ev.keyCode == 109 || ev.keyCode == 189)) {
        ev.preventDefault();
        Lp5.bg_code_alpha -= 0.05;
        if (Lp5.bg_code_alpha < 0) {
            Lp5.bg_code_alpha = 0;
        }
        Lp5.changeBgLineAlpha();
    }
});
// Global select event -----------------------------------
document.addEventListener("select", (ev) => {
    if (Lp5.cmAux.hasFocus())
        Lp5.cmSelect = new Number(Lp5.cmAux.getSelection());
});
// Global mousewheel event -----------------------------------
document.addEventListener("mousewheel", (ev) => {
    Lp5.blockData = Lp5.getCodeBlock(Lp5.cmAux, Lp5.cmAuxCp);
    if (ev.altKey && ev.ctrlKey) {
        if (Lp5.cmAux.somethingSelected()) {
            ev.preventDefault();
            var dir = Math.sign(ev.deltaY);
            if (!isNaN(Lp5.cmSelect)) {
                if (dir == 1) {
                    if (ev.shiftKey) {
                        Lp5.cmSelect -= 0.1;
                        Lp5.cmSelect = parseFloat(Lp5.cmSelect.toFixed(3));
                    } else {
                        Lp5.cmSelect--;
                    }
                }
                if (dir == -1) {
                    if (ev.shiftKey) {
                        Lp5.cmSelect += 0.1;
                        Lp5.cmSelect = parseFloat(Lp5.cmSelect.toFixed(3));
                    } else {
                        Lp5.cmSelect++;
                    }
                }
                if (Lp5.cmAux.hasFocus())
                    Lp5.cmAux.replaceSelection(
                        Lp5.cmSelect.toString(),
                        "around",
                    );
                // Refresca el fondo ya que el el replace se elimina el atributo
                Lp5.changeBgLineAlpha();
            }
            if (Lp5.blockData.func == "draw") {
                Lp5.renderCodeDraw = Lp5.doGlobals(
                    "'use strict';" + Lp5.blockData.code,
                );
            }
        }
    }
    if (ev.altKey && !ev.ctrlKey && !ev.shiftKey) {
        ev.preventDefault();
        var dir = Math.sign(ev.deltaY);
        if (dir == 1) {
            Lp5.bg_code_alpha -= 0.03;
        }
        if (dir == -1) {
            Lp5.bg_code_alpha += 0.03;
        }
        if (Lp5.bg_code_alpha < 0.0) {
            Lp5.bg_code_alpha = 0.0;
        }
        if (Lp5.bg_code_alpha > 1.0) {
            Lp5.bg_code_alpha = 1.0;
        }
        Lp5.changeBgLineAlpha();
    }
    // Sockets -------------------------------------

    if (Lp5.playmode == "livecoding") {
        if (Lp5.mode == "SERVER") {
            Lp5.server.sendClient(frameCount);
            //Lp5.server.setBookmark()
        }
        if (Lp5.mode == "CLIENT") {
            Lp5.client.sendServer();
            //Lp5.client.setBookmark()
        }
    }
    // ---------------------------------------------
    if (ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
        var dir = Math.sign(ev.deltaY);
        if (dir == 1) {
            Lp5.scale_st -= 0.1;
        }
        if (dir == -1) {
            Lp5.scale_st += 0.1;
        }
        if (Lp5.scale_st > 0.05) {
            Lp5.codeAux.style.fontSize = Lp5.scale_st + "rem";
            Lp5.codeAux.style.lineHeight = Lp5.scale_st * 1.7 + "rem";
            Lp5.cmAux.refresh();

            // Lp5.codeFrag.style.fontSize = Lp5.scale_st + "rem";
            // Lp5.codeFrag.style.lineHeight = (Lp5.scale_st * 1.7) + "rem";
            // Lp5.cmFrag.refresh()

            // Lp5.codeVert.style.fontSize = Lp5.scale_st + "rem";
            // Lp5.codeVert.style.lineHeight = (Lp5.scale_st * 1.7) + "rem";
            // Lp5.cmVert.refresh()
        } else {
            Lp5.scale_st = 0.05;
        }
    }
});
// -----------------------------------------------------
// CONFIGS EVTS ----------------------------------------
Lp5.el("cnf-playmode").addEventListener("change", () => {
    localStorage.playmode = Lp5.el("cnf-playmode").value;
    Lp5.main.reload();
});
Lp5.el("cnf-renderonfly").addEventListener("click", () => {
    if (Lp5.el("cnf-renderonfly").checked) {
        Lp5.drawOnFly = true;
        Lp5.el("lp5-lp-ar").innerHTML = " | <span>AR</span>";
    } else {
        Lp5.drawOnFly = false;
        Lp5.el("lp5-lp-ar").innerHTML = "";
    }
});
Lp5.el("cnf-sync").addEventListener("click", () => {
    if (Lp5.el("cnf-sync").checked) {
        Lp5.sync = true;
    } else {
        Lp5.sync = false;
    }
});
Lp5.el("cnf-linenumbers").addEventListener("click", () => {
    if (Lp5.el("cnf-linenumbers").checked) {
        localStorage.linenumbers = 1;
        Lp5.cmAux.setOption("lineNumbers", true);
    } else {
        localStorage.linenumbers = 0;
        Lp5.cmAux.setOption("lineNumbers", false);
    }
});
Lp5.el("cnf-codehelper").addEventListener("click", () => {
    if (Lp5.el("cnf-codehelper").checked) {
        localStorage.codehelper = 1;
        Lp5.cmAux.setOption("extraKeys", {
            "Ctrl-Space": "autocomplete",
        });
    } else {
        localStorage.codehelper = 0;
        Lp5.cmAux.setOption("extraKeys", {
            "Ctrl-Space": null,
        });
    }
});
Lp5.el("cnf-hidecanvas").addEventListener("click", () => {
    if (Lp5.el("cnf-hidecanvas").checked) {
        Lp5.el("defaultCanvas0").style.display = "none";
    } else {
        Lp5.el("defaultCanvas0").style.display = "block";
    }
});

Lp5.el("cnf-lang").addEventListener("change", () => {
    localStorage.lang = Lp5.el("cnf-lang").value;
    Lp5.main.reload();
});
Lp5.el("cnf-theme").addEventListener("change", () => {
    localStorage.theme = Lp5.el("cnf-theme").value;
    Lp5.cmAux.setOption("theme", localStorage.theme);
    if (localStorage.theme == "default" || localStorage.theme == "") {
        Lp5.el("_theme").href = "libs/codemirror/theme/none.css";
    } else {
        Lp5.el("_theme").href =
            "libs/codemirror/theme/" + localStorage.theme + ".css";
    }
    // Lp5.main.reload()
});
Lp5.el("cnf-render").addEventListener("change", () => {
    Lp5.main.reload(Lp5.el("cnf-render").value);
});
Lp5.el("cnf-server").addEventListener("change", (ev) => {
    switch (Lp5.el("cnf-server").value) {
        case "LOCAL":
            Lp5.mode = "LOCAL";
            // Close server
            if (Lp5.server != null) {
                Lp5.server.close(() => {
                    console.log("close server");
                });
                Lp5.server = null;
            }
            if (Lp5.client != null) {
                Lp5.client.close(() => {
                    console.log("close client");
                });
                Lp5.client = null;
            }
            Lp5.el("lp5-os-ip").innerText = "";

            break;

        case "SERVER":
            Lp5.mode = "SERVER";
            if (Lp5.client != null) {
                Lp5.client.close(() => {
                    console.log("close client");
                });
                Lp5.client = null;
            }
            Lp5.server = Lp5.serverRq;
            Lp5.server.initServer(Lp5);
            Lp5.el("lp5-os-ip").innerText = "| ip:" + Lp5.IP;

            break;

        case "CLIENT":
            Lp5.mode = "CLIENT";
            if (Lp5.server != null) {
                Lp5.server.close(() => {
                    console.log("close server");
                });
                Lp5.server = null;
            }

            Lp5.client = Lp5.clientRq;
            Lp5.client.connect(Lp5);
            Lp5.el("lp5-os-ip").innerText = "| ip:" + Lp5.IP;
            break;
    }
});
