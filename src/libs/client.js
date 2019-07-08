/**
 * Script client.js
 * 
 * Se encarga de administrar
 * el envío de datos y acciones al servidos
 * 
 */
let socket = null;
let lp5
// let cursor = { line: 0, ch: 0 }
function connect(_lp5) {
      lp5 = _lp5
      socket = io('http://' + lp5.configs['server-ip'] + ':' + lp5.configs['port']);
      // recive desde servidor
      socket.on('liveleparc1', data => {
            lp5.cmAux.setValue(data.codeAux)
            // sincroniza
            if (Lp5.sync) frameCount = data.frameSync
            // Restaurar cursor local despues de la actualizacion
            lp5.restoreCursor(lp5.cmAux, lp5.cmAuxCp)
      })
      socket.on('broadcast', data => {
            lp5.cmAux.setValue(data.codeAux)
            // Restaurar cursor local despues de la actualizacion
            lp5.restoreCursor(lp5.cmAux, lp5.cmAuxCp)
      })
      socket.on('eval', eval => {

            if (eval.isFunc) {
                  if (eval.func == 'setup') {
                        lp5.renderCodeDraw = lp5.doGlobals("'use strict';" + eval.code)
                        lp5.evalDraw()
                        lp5.evalLineFx('lp5-aux', eval.lf, eval.lt)
                  }
                  if (eval.func == 'draw') {
                        lp5.renderCodeDraw = lp5.doGlobals("'use strict';" + eval.code)
                        lp5.evalDraw()
                        lp5.evalLineFx('lp5-aux', eval.lf, eval.lt)
                  }
                  if (eval.func == 'any') {
                        lp5.renderCodeAux = lp5.doGlobals("'use strict';" + eval.code)
                        lp5.evalAux()
                        lp5.evalLineFx('lp5-aux', eval.lf, eval.lt)
                  }
            } else {
                  lp5.renderCodeAux = lp5.doGlobals("'use strict';" + eval.code)
                  lp5.evalAux()
                  lp5.evalLineFx('lp5-aux', eval.lf, eval.lt)
            }
      })
      // Sincroniza frameCount con servidor
      socket.on('sync', fc => {
            if (Lp5.sync) frameCount = fc
      })
}
exports.connect = function (lp5) {
      connect(lp5)
}
exports.close = function () {
      socket.close()
}
exports.eval = function (_b) {
      socket.emit('eval', _b)
}
exports.sendServer = function () {
      // cursores 
      let cAux = lp5.cmAux.getCursor()

      let o = {
            // ID
            id: socket.id,
            cmContext: 'aux',
            // bloques
            codeAux: lp5.cmAux.getValue(),
            // cursores
            cAux: cAux,
            nodeName: Lp5.nodeName
      }
      // if (socket) {
      socket.emit('liveleparc1', o)
      // }
}
