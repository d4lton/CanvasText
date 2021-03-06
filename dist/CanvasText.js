'use strict';

/**
* Canvas Text
*
* Copyright ©2017 Dana Basken <dbasken@gmail.com>
*
*/

var CanvasText = {

  M_HEIGHT_FACTOR: 1.2,
  DEFAULT_LINE_HEIGHT: 1.5,
  DEFAULT_FONT_SIZE: 12,
  DEFAULT_FONT_FAMILY: 'Comic Sans MS',
  DEFAULT_FONT_COLOR: '#000000',
  FONT_HEIGHT_METHOD: 'canvas', // fontSize, measureM, dom, canvas

  fontHeightCache: {},
  fontOffsetCache: {},
  fontDescenderCache: {},

  /**
   * Draws word-wrapped text on a canvas, taking into account font size, top/right/bottom/left padding,
   * line height, horizontal and vertical alignment
   *
   * @param context {CanvasRenderingContext2D} The canvas context to render text into
   * @param object {Object} The text object
   *
   * Text Object has at least these properties:
   *
   *    var text = {
   *          text: 'Buy Our Stuff! $49.95!',
   *          align: 'right',    // right, left, center
   *          valign: 'bottom',  // top, bottom, middle
   *          paddingTop: 0,     // you can also just specify padding to set top/right/bottom/left
   *          paddingLeft: 150,
   *          paddingRight: 10,
   *          paddingBottom: 5,
   *          color: '#FF0000',
   *          fontSize: 20,
   *          fontFamily: 'Comic Sans MS',
   *        };
   *
   * The canvas context you pass to drawText should have a width and height assigned.
   */
  drawText: function drawText(context, object) {
    context.save();

    this._padding = CanvasText.resolvePadding(object);

    context.font = CanvasText.resolveFont(object);
    context.fillStyle = this.resolveColor(object.color, object.alpha);
    context.textAlign = object.align;
    context.textBaseline = 'top';

    var offset = CanvasText.resolveShadowOffset(object);
    context.shadowColor = object.shadowColor;
    context.shadowBlur = object.shadowBlur;
    context.shadowOffsetX = offset.x;
    context.shadowOffsetY = offset.y;

    var area = CanvasText.renderWordWrapRows(context, object, CanvasText.makeWordWrapRows(context, object));

    context.restore();

    return area;
  },

  renderWordWrapRows: function renderWordWrapRows(context, object, rows) {
    var lineHeight = typeof object.lineHeight !== 'undefined' ? object.lineHeight : CanvasText.DEFAULT_LINE_HEIGHT;
    var fontHeight = CanvasText.fontHeight(context, object);
    var rowHeight = fontHeight * lineHeight;

    var descenderHeight = CanvasText.fontDescenderCache[context.font] - CanvasText.fontHeightCache[context.font];

    var rowX = this._padding.left;
    if (object.align === 'right') {
      rowX = context.canvas.width - this._padding.right;
    }
    if (object.align === 'center') {
      rowX = context.canvas.width / 2;
    }

    var rowY = this._padding.top;
    if (object.valign === 'bottom') {
      rowY = context.canvas.height - rows.length * rowHeight - descenderHeight - this._padding.bottom;
    }
    if (object.valign === 'middle') {
      rowY = (context.canvas.height - rows.length * rowHeight) / 2;
    }

    var totalArea = 0;
    rows.forEach(function (row) {
      var width = CanvasText.calculateRowWidth(context, object, row);
      context.fillText(row, rowX, rowY - CanvasText.fontOffsetCache[context.font] + (rowHeight - fontHeight) / 2);
      CanvasText.renderDecoration(context, object, rowX, rowY, fontHeight, rowHeight, width);
      totalArea += fontHeight * width;
      rowY += rowHeight;
    });

    return totalArea;
  },

  renderDecoration: function renderDecoration(context, object, x, y, height, rowHeight, width) {
    if (object.decoration && object.decoration !== 'none') {

      context.save();

      context.shadowBlur = 0;
      context.shadowColor = 'rgba(0, 0, 0, 0)';
      context.strokeStyle = this.resolveColor(object.color, object.alpha);
      context.lineWidth = Math.max(1, height / 10);
      context.lineCap = 'round';

      var lineWidth = width - (this._padding.left + this._padding.right);

      var lineX = x;
      if (object.align === 'right') {
        lineX = x - lineWidth;
      }
      if (object.align === 'center') {
        lineX = x - lineWidth / 2;
      }

      var lineY = y + height;
      if (object.decoration === 'underline') {
        lineY += Math.min(20, height / 2);
      }
      if (object.decoration === 'strikethrough') {
        lineY = y + rowHeight / 2;
        lineY += Math.min(8, context.lineWidth * 2);
      }

      context.beginPath();
      context.moveTo(lineX, lineY);
      context.lineTo(lineX + lineWidth, lineY);
      context.stroke();

      context.restore();
    }
  },

  makeWordWrapRows: function makeWordWrapRows(context, object) {
    var words = object.text.split(/ /);
    var rowWords = [];
    var rows = [];
    words.forEach(function (word) {
      var rowWidth = CanvasText.calculateRowWidth(context, object, rowWords.concat(word).join(' '));
      if (rowWidth >= context.canvas.width && rowWords.length > 0) {
        rows.push(rowWords.join(' '));
        rowWords = [];
      }
      rowWords.push(word);
    });
    if (rowWords.length > 0) {
      rows.push(rowWords.join(' '));
    }
    return rows;
  },

  resolveFont: function resolveFont(object) {
    if (object.font) {
      return object.font;
    } else {
      var fontSize = object.fontSize ? object.fontSize : CanvasText.DEFAULT_FONT_SIZE;
      var fontFamily = object.fontFamily ? object.fontFamily : CanvasText.DEFAULT_FONT_FAMILY;
      return fontSize + "pt '" + fontFamily + "'";
    }
  },

  resolveColor: function resolveColor(color, alpha) {
    if (typeof alpha !== 'undefined') {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
      return 'rgba(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) + ', ' + alpha + ')';
    } else {
      return color;
    }
  },

  resolvePadding: function resolvePadding(object) {
    var padding = {};
    var defaultPadding = typeof object.padding !== 'undefined' ? object.padding : 0;
    padding.left = typeof object.paddingLeft !== 'undefined' ? object.paddingLeft : defaultPadding;
    padding.right = typeof object.paddingRight !== 'undefined' ? object.paddingRight : defaultPadding;
    padding.top = typeof object.paddingTop !== 'undefined' ? object.paddingTop : defaultPadding;
    padding.bottom = typeof object.paddingBottom !== 'undefined' ? object.paddingBottom : defaultPadding;
    return padding;
  },

  resolveShadowOffset: function resolveShadowOffset(object) {
    if (object.shadowOffset) {
      return {
        x: object.shadowOffset,
        y: object.shadowOffset
      };
    } else {
      return {
        x: object.shadowOffsetX,
        y: object.shadowOffsetY
      };
    }
  },

  calculateRowWidth: function calculateRowWidth(context, object, text) {
    return context.measureText(text).width + this._padding.left + this._padding.right;
  },

  fontHeight: function fontHeight(context, object) {
    // why oh why does context.measureText() not return height?
    if (!CanvasText.fontHeightCache[context.font]) {
      CanvasText.fontOffsetCache[context.font] = 0;
      switch (CanvasText.FONT_HEIGHT_METHOD) {
        case 'fontSize':
          var fontSize = parseInt(CanvasText.resolveFont(object));
          CanvasText.fontHeightCache[context.font] = fontSize * CanvasText.M_HEIGHT_FACTOR;
          break;
        case 'measureM':
          CanvasText.fontHeightCache[context.font] = context.measureText('M').width * CanvasText.M_HEIGHT_FACTOR;
          break;
        case 'dom':
          var div = document.createElement("div");
          div.innerHTML = object.text;
          div.style.position = 'absolute';
          div.style.top = '-9999px';
          div.style.left = '-9999px';
          div.style.font = context.font;
          document.body.appendChild(div);
          var size = { width: div.clientWidth, height: div.clientHeight };
          document.body.removeChild(div);
          CanvasText.fontHeightCache[context.font] = size.height;
          break;
        case 'canvas':
          CanvasText.fontHeightCache[context.font] = CanvasText.canvasFontHeight(context, object);
          break;
      }
    }
    return CanvasText.fontHeightCache[context.font];
  },

  canvasFontHeight: function canvasFontHeight(context, object) {
    CanvasText.fontDescenderCache[context.font] = this.canvasFontHeightForText(context, object, 'Mqypgj');
    return this.canvasFontHeightForText(context, object, 'M');
  },

  canvasFontHeightForText: function canvasFontHeightForText(context, object, text) {
    var offset = 10;
    var fontSize = parseInt(CanvasText.resolveFont(object));

    var canvas = document.createElement('canvas');
    canvas.height = fontSize * 5;
    canvas.width = context.measureText(text).width * 2;

    var fontContext = canvas.getContext('2d');
    fontContext.font = context.font;
    fontContext.textAlign = 'left';
    fontContext.textBaseline = 'top';
    fontContext.fillText(text, offset, offset);

    var data = fontContext.getImageData(0, 0, canvas.width, canvas.height).data;

    var first = canvas.height,
        last = 0;
    for (var y = 0; y < canvas.height; y++) {
      for (var x = 0; x < canvas.width; x++) {
        var alpha = data[(canvas.width * y + x) * 4 + 3];
        if (alpha > 0) {
          if (y < first) {
            first = y;
          }
          if (y > last) {
            last = y;
          }
        }
      }
    }

    CanvasText.fontOffsetCache[context.font] = first - offset;

    return last - first;
  }

};

module.exports = CanvasText;
