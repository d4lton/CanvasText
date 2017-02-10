/**
 * Canvas Text
 *
 * Copyright ©2017 Dana Basken <dbasken@gmail.com>
 *
 */

var CanvasText = {

    M_HEIGHT_FACTOR: 1.2,
    DEFAULT_FONT_SIZE: 12,
    DEFAULT_FONT_FAMILY: 'Comic Sans MS',
    DEFAULT_FONT_COLOR: '#000000',
    FONT_HEIGHT_METHOD: 'canvas', // fontSize, measureM, dom, canvas

    fontHeightCache: {},

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
    drawText: function(context, object) {
        var fontSize = object.fontSize ? object.fontSize : CanvasText.DEFAULT_FONT_SIZE;
        var fontFamily = object.fontFamily ? object.fontFamily : CanvasText.DEFAULT_FONT_FAMILY;

        context.save();

        context.font = fontSize + "pt '" + fontFamily + "'";
        context.textBaseline = 'hanging';
        context.fillStyle = object.color ? object.color : CanvasText.DEFAULT_FONT_COLOR;

        CanvasText.resolvePadding(object);

        CanvasText.renderWordWrapRows(context, object, CanvasText.makeWordWrapRows(context, object));

        context.restore();
    },

    resolvePadding: function(object) {
        object.padding = (typeof object.padding !== 'undefined') ? object.padding : 0;
        object.paddingLeft = (typeof object.paddingLeft !== 'undefined') ? object.paddingLeft : object.padding;
        object.paddingRight = (typeof object.paddingRight !== 'undefined') ? object.paddingRight : object.padding;
        object.paddingTop = (typeof object.paddingTop !== 'undefined') ? object.paddingTop : object.padding;
        object.paddingBottom = (typeof object.paddingBottom !== 'undefined') ? object.paddingBottom : object.padding;
    },

    makeWordWrapRows: function(context, object) {
        var words = object.text.split(/ /);
        var spaceWidth = context.measureText(' ').width;
        var rowWidth = CanvasText.calculateRowWidth(context, object, '');
        var rowWords = [];
        var rows = [];
        words.forEach(function(word) {
            var width = context.measureText(word).width;
            if (rowWidth + width >= context.canvas.width) {
                rows.push(rowWords.join(' '));
                rowWords = [];
                rowWidth = CanvasText.calculateRowWidth(context, object, '');
            }
            rowWords.push(word);
            rowWidth = CanvasText.calculateRowWidth(context, object, rowWords.join(' '));
        });
        if (rowWords.length > 0) {
            rows.push(rowWords.join(' '));
        }
        return rows;
    },

    calculateRowWidth: function(context, object, text) {
        return context.measureText(text).width + (object.paddingLeft + object.paddingRight);
    },

    renderWordWrapRows: function(context, object, rows) {
        var lineHeight = object.lineHeight ? object.lineHeight : 1;
        var rowHeight = CanvasText.fontHeight(context, object) * lineHeight;

        var rowX = object.paddingLeft;
        if (object.align === 'right') {
            rowX = context.canvas.width - object.paddingRight;
        }
        if (object.align === 'center') {
            rowX = context.canvas.width / 2;
        }

        var rowY = object.paddingTop;
        if (object.valign === 'bottom') {
            rowY = (context.canvas.height - (rows.length * rowHeight)) - object.paddingBottom;
        }
        if (object.valign === 'middle') {
            rowY = (context.canvas.height - (rows.length * rowHeight)) / 2;
        }

        rows.forEach(function(row) {
            var rowCanvas = CanvasText.makeWordWrapCanvas(context, object, rowX, rowHeight, row);
            context.drawImage(rowCanvas, 0, rowY);
            rowY += rowCanvas.height;
        });
    },

    fontHeight: function(context, object) {
        // why oh why does context.measureText() not return height?
        if (!CanvasText.fontHeightCache[context.font]) {
            switch (CanvasText.FONT_HEIGHT_METHOD) {
                case 'fontSize':
                    var fontSize = object.fontSize ? object.fontSize : CanvasText.DEFAULT_FONT_SIZE;
                    CanvasText.fontHeightCache[context.font] = fontSize * CanvasText.M_HEIGHT_FACTOR;
                    break;
                case 'measureM':
                    CanvasText.fontHeightCache[context.font] = context.measureText('M').width * CanvasText.M_HEIGHT_FACTOR;
                    break;
                case 'dom':
                    var div = document.createElement("div");
                    div.innerHTML = object.text;
                    div.style.position = 'absolute';
                    div.style.top  = '-9999px';
                    div.style.left = '-9999px';
                    div.style.font = context.font;
                    document.body.appendChild(div);
                    var size = {width: div.clientWidth, height: div.clientHeight};
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

    canvasFontHeight: function(context, object) {
        var testString = 'Mjqye';
        var fontSize = object.fontSize ? object.fontSize : CanvasText.DEFAULT_FONT_SIZE;
        var canvas = document.createElement('canvas');
        canvas.height = fontSize * 2;
        canvas.width = context.measureText(testString).width;
        var fontContext = canvas.getContext('2d');
        fontContext.font = context.font;
        fontContext.textAlign = 'left';
        fontContext.textBaseline = 'top';
        fontContext.fillText(testString, 5, 5);
        var data = fontContext.getImageData(0, 0, canvas.width, canvas.height).data;

        var first = canvas.height, last = 0;
        for (var y = 0; y < canvas.height; y++) {
            for (var x = 0; x < canvas.width; x++) {

                var alpha = data[((canvas.width * y) + x) * 4 + 3];
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
        return last - first;
    },

    makeWordWrapCanvas: function(context, object, xPos, height, text) {
        var canvas = document.createElement('canvas');
        var rowContext = canvas.getContext('2d');

        canvas.width = context.canvas.width;
        canvas.height = height;

        rowContext.font = context.font;
        rowContext.fillStyle = context.fillStyle;
        rowContext.textBaseline = context.textBaseline;
        rowContext.textAlign = object.align;


        rowContext.fillText(text, xPos, 0);
        return canvas;
    }

};

export default CanvasText;