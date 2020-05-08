class FacemeshMap {
  static get VERTEX_SHADER_SOURCE() {
    return /* GLSL */`
attribute vec3 a_position;
uniform vec2 u_resolution;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
void main() {
  // Add in the translation.
  vec2 position = a_position.xy;

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clip space)
  vec2 clipSpace = zeroToTwo - 1.0;

  // flip it traditional canvas coordinate, 0,0 top left
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  // gl_PointSize = u_pSize;
  gl_PointSize = 3.0;

  // Pass the texcoord to the fragment shader.
  v_texcoord = a_texcoord;
}
`
  }
  static get FRAGMENT_SHADER_SOURCE() {
    return /* GLSL */`
// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default
precision mediump float;

// Passed in from the vertex shader.
varying vec2 v_texcoord;
  
// The texture.
uniform sampler2D u_texture;
void main() {
  vec4 color = texture2D(u_texture, v_texcoord);
  gl_FragColor = color;
}
`
  }

  _setupProgram() {
    this._vertexShader = createShader(this._gl, this._gl.VERTEX_SHADER, FacemeshMap.VERTEX_SHADER_SOURCE);
    this._fragmentShader = createShader(this._gl, this._gl.FRAGMENT_SHADER, FacemeshMap.FRAGMENT_SHADER_SOURCE);
    this._program = createProgram(this._gl, this._vertexShader, this._fragmentShader);
    
    this._resolutionUniformLocation = this._gl.getUniformLocation(this._program, "u_resolution");
    // send position data as attribute in the form of a buffer
    // create attr
    this._positionAttributeLocation = this._gl.getAttribLocation(this._program, "a_position");
    this._texcoordLocation = this._gl.getAttribLocation(this._program, "a_texcoord");
    
    this._gl.viewport(0, 0, this._gl.canvas.width, this._gl.canvas.height);
    // Clear the canvas
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    // Tell it to use our program (pair of shaders)
    this._gl.useProgram(this._program);
    // assign value to resolution
    this._gl.uniform2f(this._resolutionUniformLocation, this._gl.canvas.width, this._gl.canvas.height);
  }

  _setupTexture() {
    this._texCoordbuffer = this._gl.createBuffer();
    // bind buffer to gl
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._texCoordbuffer);

    this._gl.enableVertexAttribArray(this._texcoordLocation);
 
    // We'll supply texcoords as floats.
    this._gl.vertexAttribPointer(this._texcoordLocation, 2, this._gl.FLOAT, false, 0, 0);
    var textCoords = TRIANGULATION.reduce((acc, val) => {
      var idx = val * 2;
      return acc.concat(
        textureMap[idx],
        textureMap[idx + 1]
      );
    }, []);
    
    // TRIANGULATION.reduce(function(acc, val) {
    //   var {x, y} = indexToTextureCoords[val];
    //   return acc.concat([x,y])
    // }, []);
    
    // Set Texcoords.
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER, 
      new Float32Array(textCoords), 
      this._gl.STATIC_DRAW
    );

    // Create a texture.
    this._texture = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
    
    // Fill the texture with a 1x1 blue pixel.
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, 1, 1, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                  new Uint8Array([0,   0,   255, 50]));
    
    // Asynchronously load an image
    var image = new Image();
    // image.src = "f-texture.png";
    image.src = this._textureFilePath;
    image.addEventListener('load', () => {
      // Now that the image has loaded make copy it to the texture.
      this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
      this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, image);
      this._gl.generateMipmap(this._gl.TEXTURE_2D);
    });
  }

  _setupPosition() {
    // turn the attribute on
    this._positionBuffer = this._gl.createBuffer();
    // bind buffer to gl
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer);
    this._gl.enableVertexAttribArray(this._positionAttributeLocation);
    
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 x, y, z components per iteration
    var type = this._gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    this._gl.vertexAttribPointer(this._positionAttributeLocation, size, type, normalize, stride, offset);
  }

  render(positionBufferData) {
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    if(dc.dirty) {
      this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
      this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, dc.el);
      this._gl.generateMipmap(this._gl.TEXTURE_2D);
      dc.dirty = false;
    }
    this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(positionBufferData), this._gl.STATIC_DRAW);
    this._gl.drawArrays(this._gl.TRIANGLES, 0, TRIANGULATION.length);
  }

  constructor(id, textureFilePath, w, h) {
    this._canvas = document.querySelector(`#${id}`);
    this._canvas.width = w;
    this._canvas.height = h;
    this._textureFilePath = textureFilePath;
    this._gl = this._canvas.getContext("webgl");
    this.positionBufferData = [];
    this._setupProgram();
    this._setupTexture();
    this._setupPosition();
  }
}