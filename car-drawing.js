/** utils */

window.requestAnimFrame = function() {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(a) {
			window.setTimeout(a, 1E3 / 60)
		}
}();

/** shaders */

const VS =
	'attribute vec3 aVertexPosition;' +
	'attribute vec4 aVertexColor;' +

	'uniform mat4 uMVMatrix;' +
	'uniform mat4 uPMatrix;' +

	'varying vec4 vColor;' +

	'void main(void) {' +
	'    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);' +
	'    vColor = aVertexColor;' +
	'}';

const FS =
	'precision mediump float;' +

	'varying vec4 vColor;' +

	'void main(void) {' +
	'  gl_FragColor = vColor;' +
	'}';

var canvas = document.getElementById('scene');
var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
var keyboard = [];
var vertexShader, fragmentShader, shaderProgram;
var perspectiveMatrix = mat4.create(), viewMatrix = mat4.create();
var car;

/** mark class */

var Mark = function(pos, angle) {
	this.initVertices();
	this.initColors();

	this.matrix = mat4.create();
	mat4.identity(this.matrix);

	if (pos) {
		mat4.translate(this.matrix, pos);
		mat4.rotateY(this.matrix, angle);
	}
};

Mark.prototype.initVertices = function() {
	/** create vertex buffer for car body */

	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

	var vertices = [
		-0.5, -1.1, -1.0,
		0.5, -1.1, -1.0,
		0.5, -1.1, 1.0,
		-0.5, -1.1, 1.0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = 6;

	/** create index buffer */

	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

	var indidces = [
		0, 1, 2, 0, 2, 3
	];

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indidces), gl.STATIC_DRAW);
	this.indexBuffer.itemSize = 1;
	this.indexBuffer.numItems = 6;
};

Mark.prototype.initColors = function() {
	this.colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);

	var colors = [
		[1.0, 0.0, 0.0, 1.0]
	];

	var unpackedColors = [];
	for (var i in colors) {
		var color = colors[i];
		for (var j = 0; j < 4; j++) {
			unpackedColors = unpackedColors.concat(color);
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
	this.colorBuffer.itemSize = 4;
	this.colorBuffer.numItems = 4;
};

Mark.prototype.draw = function() {
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	setMatrixUniforms(this.matrix);
	gl.drawElements(gl.TRIANGLES, this.vertexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};

/** karl class */

var Karl = function () {
	this.marx = [];
	this.spawnDist = 4;
	this.currentDist = this.spawnDist;
	this.prevPos = vec3.create();
};

Karl.prototype.update = function(pos, angle) {
	var dist = vec3.create();
	vec3.subtract(pos, this.prevPos, dist);
	this.currentDist += vec3.length(dist);

	if (this.currentDist >= this.spawnDist) {
		this.currentDist -= this.spawnDist;
		// TODO: adjust
		this.marx.push(new Mark(pos, angle));
	}

	this.prevPos = vec3.create(pos);
};

Karl.prototype.draw = function() {
	for (var i = 0; i < this.marx.length; i++) {
		this.marx[i].draw();
	}
};

/** car class */

var Car = function() {
	this.initVertices();
	this.initColors();

	this.angle = 0;
	this.angleVelocity = 0;
	this.angleAccel = 0;
	this.position = vec3.create([0, 0, 0]);
	this.velocity = 0.01;
	this.accel = 0;
	this.direction = vec3.create([0, 0, +1]);
	this.matrix = mat4.create();
	mat4.identity(this.matrix);

	this.karl = new Karl();
};

Car.prototype.initVertices = function() {
	/** create vertex buffer for car body */

	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

	var vertices = [
		// front face
		-1.0, -1.0, 1.0,
		1.0, -1.0, 1.0,
		1.0, 1.0, 1.0,
		-1.0, 1.0, 1.0,

		// back face
		-1.0, -1.0, -1.0,
		-1.0, 1.0, -1.0,
		1.0, 1.0, -1.0,
		1.0, -1.0, -1.0,

		// top face
		-1.0, 1.0, -1.0,
		-1.0, 1.0, 1.0,
		1.0, 1.0, 1.0,
		1.0, 1.0, -1.0,

		// bottom face
		-1.0, -1.0, -1.0,
		1.0, -1.0, -1.0,
		1.0, -1.0, 1.0,
		-1.0, -1.0, 1.0,

		// right face
		1.0, -1.0, -1.0,
		1.0, 1.0, -1.0,
		1.0, 1.0, 1.0,
		1.0, -1.0, 1.0,

		// left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0, 1.0,
		-1.0, 1.0, 1.0,
		-1.0, 1.0, -1.0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	this.vertexBuffer.itemSize = 3;
	this.vertexBuffer.numItems = 24;

	/** create index buffer for car body */

	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

	var indidces = [
		0, 1, 2, 0, 2, 3, // front face
		4, 5, 6, 4, 6, 7, // back face
		8, 9, 10, 8, 10, 11, // top face
		12, 13, 14, 12, 14, 15, // bottom face
		16, 17, 18, 16, 18, 19, // right face
		20, 21, 22, 20, 22, 23  // left face
	];

	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indidces), gl.STATIC_DRAW);
	this.indexBuffer.itemSize = 1;
	this.indexBuffer.numItems = 36;
};

Car.prototype.initColors = function() {
	this.colorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);

	var colors = [
		[1.0, 0.0, 0.0, 1.0],
		// front face
		[1.0, 1.0, 0.0, 1.0],
		// back face
		[0.0, 1.0, 0.0, 1.0],
		// top face
		[1.0, 0.5, 0.5, 1.0],
		// bottom face
		[1.0, 0.0, 1.0, 1.0],
		// right face
		[0.0, 0.0, 1.0, 1.0]  // left face
	];

	var unpackedColors = [];
	for (var i in colors) {
		var color = colors[i];
		for (var j = 0; j < 4; j++) {
			unpackedColors = unpackedColors.concat(color);
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
	this.colorBuffer.itemSize = 4;
	this.colorBuffer.numItems = 24;
};

Car.prototype.update = function () {
	var delta = 1000 / 60;

	/** update car coordinates */

	this.angleAccel *= 0.6;
	this.angleVelocity += delta * this.angleAccel;
	this.angle += delta * this.angleVelocity;

	this.direction[0] = Math.sin(this.angle);
	this.direction[2] = Math.cos(this.angle);
	vec3.normalize(this.direction, this.direction);

	this.accel *= 0.9;
	this.velocity += delta * this.accel;
	var deltaPos = delta * this.velocity;
	var deltaVec = vec3.scale(this.direction, deltaPos);
	vec3.add(this.position, deltaVec);

	var rotateMat = mat4.create();
	mat4.identity(rotateMat);
	mat4.rotateY(rotateMat, this.angle);

	mat4.identity(this.matrix);
	mat4.translate(this.matrix, this.position);

	mat4.multiply(this.matrix, rotateMat);

	this.karl.update(this.position, this.angle);
};

Car.prototype.draw = function() {
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	setMatrixUniforms(this.matrix);
	gl.drawElements(gl.TRIANGLES, this.vertexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	this.karl.draw();
};

Car.prototype.brake = function(direction) {
	this.angleAccel += direction * -0.00001;
};

Car.prototype.accelerate = function(pulse) {
	this.accel += pulse * 0.000001;
};

/** application */

function init() {
	initGL();
	initShaders();
	initInput();

	car = new Car();
}

function initGL() {
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;

	gl.clearColor(0.1, 0.1, 0.0, 0.1);
	gl.enable(gl.DEPTH_TEST);
	//gl.enable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
}

function initShaders() {
	/** create & compile shaders */

	vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, VS);
	gl.compileShader(vertexShader);

	fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, FS);
	gl.compileShader(fragmentShader);

	/** initialize shaders */

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

function initInput() {
	document.addEventListener('keydown', function(e) {
		keyboard[e.keyCode] = true;
	});

	document.addEventListener('keyup', function(e) {
		keyboard[e.keyCode] = false;
	});
}

function handleInput() {
	if (keyboard[38] /* up */) {
		car.accelerate(+1);
	} else if (keyboard[40] /* down */) {
		car.accelerate(-1);
	}

	if (keyboard[37] /* left */) {
		car.brake(-1);
	} else if (keyboard[39] /* right */) {
		car.brake(+1);
	}
}

function update() {
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, perspectiveMatrix);
	mat4.identity(viewMatrix);

	var distCam = vec3.add([0.0, 15.0 * car.velocity * 100, -20.0 * car.velocity * 100], car.position);
	mat4.lookAt(distCam, car.position, [0, 1, 0], viewMatrix);

	car.update();
}

function draw() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	car.draw();
}

function setMatrixUniforms(matrix) {
	var viewModelMatrix = mat4.create();
	mat4.multiply(viewMatrix, matrix, viewModelMatrix);

	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, perspectiveMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, viewModelMatrix);
}

init();
window.requestAnimFrame(function drawScene() {
	handleInput();
	update();
	draw();
	window.requestAnimFrame(drawScene);
});