class DrawingCanvas {
  static get TOOLS() {
    return ['brush', 'paint'];
  }
  set size(val) {
    if(isNaN(val)) return;
    this._strokeWidth = Number(val);
  }
  set tool(val) {
    if(DrawingCanvas.TOOLS.indexOf(val) === -1) return;
    this._tool = val;
  }
  get color() {
    const c = this._color;
    return `rgba(${c[0]},${c[1]},${c[2]},${c[3]/255})`;
  }

  set color(val) {
    if(!Array.isArray(val) && val.length < 4) return;
    this._color = val;
  }

  // get dataURL() {
  //   return this._canvas.toDataURL();
  // }

  get el() {
    return this._canvas;
  }

  get dirty() {
    return this._dirty;
  }

  set dirty(val) {
    val = Boolean(val);
    this._dirty = val;
  }

  undo() {
    this._strokes.pop();
    this._dirty = true;
  }

  clear() {
    this._strokes = [];
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._dirty = true;
  }

  _colorAtPixelPos(pixelPos) {
    const r = this._pixel.data[pixelPos];	
    const g = this._pixel.data[pixelPos+1];	
    const b = this._pixel.data[pixelPos+2];
    const a = this._pixel.data[pixelPos+3];
    return [r, g, b, a];
  }
  
  _matchColor(pixelPos, c) {
    const [r, g, b, a] = this._colorAtPixelPos(pixelPos);
    return (r == c[0] && g == c[1] && b == c[2]);
  }

  _colorPixel(pixelPos, c) {
    this._pixel.data[pixelPos] = c[0];
    this._pixel.data[pixelPos+1] = c[1];
    this._pixel.data[pixelPos+2] = c[2];
    this._pixel.data[pixelPos+3] = c[3];
  }

  _fill(e) {
    if(this._pointerDown || this._tool !== 'paint') return;
    this._strokes.push({
      x: e.clientX - this._pos.left, 
      y: e.clientY - this._pos.top,
      c: this._color,
      t: 'paint'
    });
  }

  // Copyright 2010 William Malone (www.williammalone.com)
  _floodFill({ x, y, c }) {
    this._pixel = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    this._pixelStack = [[x, y]];
    const sc = this._colorAtPixelPos((y * this._canvas.width + x) * 4);
    while(this._pixelStack.length) {
      let newPos, x, y, pixelPos, reachLeft, reachRight;
      newPos = this._pixelStack.pop();
      x = newPos[0];
      y = newPos[1];
      
      pixelPos = (y * this._canvas.width + x) * 4;

      while(y >= 0 && this._matchColor(pixelPos, sc)) {
        y -= 1;
        pixelPos -= this._canvas.width * 4;
      }
      y += 1;
      pixelPos += this._canvas.width * 4;
      reachLeft = false;
      reachRight = false;
      
      while(y <= this._canvas.height - 1 && this._matchColor(pixelPos, sc)) {
        y += 1;
        
        this._colorPixel(pixelPos, c);

        if(x > 0) {
          if(this._matchColor(pixelPos - 4, sc)) {
            if(!reachLeft) {
              this._pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          } else if(reachLeft) {
            reachLeft = false;
          }
        }
      
        if(x < this._canvas.width - 1) {
          if(this._matchColor(pixelPos + 4, sc)) {
            if(!reachRight) {
              this._pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          } else if(reachRight) {
            reachRight = false;
          }
        }
          
        pixelPos += this._canvas.width * 4;
      }
    }
    this._ctx.putImageData(this._pixel, 0, 0);
    this._pixel = null;
  }
  _render() {
    window.requestAnimationFrame(this._render);
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._strokes.forEach(action => {
      if(action.t === 'paint') {
        this._floodFill(action);
        return;
      }
      const ctx = this._ctx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // https://shuding.github.io/apple-pencil-safari-api-test/
      action.forEach((p, i) => {
        if(i === 0) return;
        const prev = action[i - 1];
        ctx.strokeStyle = p.c;
        const xc = (p.x + prev.x) * 0.5;
        const yc = (p.y + prev.y) * 0.5;
        // const lw = (Math.log(p.p + 1) * 40 + p.s * 0.8);
        ctx.lineWidth = p.s * (p.p * 2 || 1); 
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
        ctx.quadraticCurveTo(xc, yc, p.x, p.y);
        // ctx.moveTo(xc, yc);
        // ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.closePath();
      });
    })
  }
  _handleUp(e) {
    if(!this._pointerDown && this._tool !== 'paint') return;
    this._canvas.removeEventListener('pointerup', this._handleUp);
    this._canvas.removeEventListener('pointermove', this._handleMove);
    this._pointerDown = false;
  }
  _handleCancel(e) {
    if(!this._pointerDown) return;
    this._pointerDown = false;
  }
  _handleMove(e) {
    if(!this._pointerDown || this._tool !== 'brush') return;
    this._strokes[this._strokes.length - 1].push({
      x: (e.clientX - this._transform.left) * this._transform.scaleX, 
      y: (e.clientY - this._transform.top) * this._transform.scaleY,
      p: e.pressure,
      c: this.color,
      s: this._strokeWidth,
      t: this._tool
    });
    this._dirty = true;
  }
  _handleDown(e) {
    if(this._pointerDown || this._tool !== 'brush') return;
    this._handleUp = this._handleUp.bind(this);
    this._canvas.addEventListener('pointerup', this._handleUp);
    this._handleMove = this._handleMove.bind(this);
    this._canvas.addEventListener('pointermove', this._handleMove);
    this._pointerDown = true;
    this._strokes.push([]);
    // this.color = [Math.random()*255, 122, 122, 1];
    this._handleMove(e);
  }
  _addEventListeners() {
    this._render = this._render.bind(this);
    this._handleCancel = this._handleCancel.bind(this);
    this._canvas.addEventListener('pointercancel', this._handleCancel);
    this._handleDown = this._handleDown.bind(this);
    this._canvas.addEventListener('pointerdown', this._handleDown);
    this._fill = this._fill.bind(this);
    this._canvas.addEventListener('dblclick', this._fill);
    this.undo = this.undo.bind(this);
    this.clear = this.clear.bind(this);
  }
  constructor(id = 'canvas', w = window.innerWidth, h = window.innerHeight) {
    this._canvas = document.querySelector(`#${id}`);
    this._canvas.width = w;
    this._canvas.height = h;
    var rect = this._canvas.getBoundingClientRect();
    this._transform = {
      scaleX: w / rect.width,
      scaleY: h / rect.height,
      left: rect.x,
      top: rect.y
    };
    // adjustment for object-fit contain
    // if wider than taller then padding on left and right
    if(window.innerWidth * 0.5 > window.innerHeight) {
      this._transform.left += (window.innerWidth * 0.5 - window.innerHeight) * 0.5;
    } 
    // if taller than wider then padding on top and bottom
    else if(window.innerWidth * 0.5 < window.innerHeight) {
      this._transform.top += (window.innerHeight - window.innerWidth * 0.5) * 0.5;
    }
    this._ctx = this._canvas.getContext('2d');
    this._pointerDown = false;
    this._strokes = [];
    this._color = [0, 0, 0, 255];
    this._strokeWidth = 40;
    this._tool = 'brush';
    this._dirty = true;
    this._addEventListeners();
    this._render();
  }
}