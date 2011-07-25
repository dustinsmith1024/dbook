/*
	Initialize
		- draw the court
		- draw 5 players (all offense)
		- load up initializers
			- click or tap
				- if no players selected
					- make a selection if clicked on a player
					- do nothing if not clicked on
				- if selection already made
					- pull up actions menu if clicked
			- click save step
				-  wrap all recent moves in a step

		- Set up baseline for players
			- push player locations onto steps
			- 
		- 
		
		steps = [
		 {	players starting locations for step,
			any actions or movements of players in between,
		 	players ending location for step
		 },
		 { player },
		 { }
		];
		
		TODO:
			setup save action button -> possible to auto-save actions and have a clear button
			somehow save actions with a status of "before", "after", or "same time" as other actions
				allow for players to move at the same time and ball to move while players move, etc
			when saving a step have the final position of a step be the starting point of next step
			
*/

var socket = io.connect('http://localhost:3000/');
socket.on('disconnect', function(){
			console.log("Server Connection Dropped!");
});
socket.on('connection', function(){
	console.log("Server Connection to Socket.io");
});
var canvas,
	$canvas,
	court,
	$CANVAS,
	$COURT_CANVAS,
	cssScale,
	$ghostcanvas, // we use a fake canvas to draw individual shapes for selection testing
	INTERVAL = 100,  // how often, in milliseconds, we check to see if a redraw is needed
	isDrag = false,
// when set to true, the canvas will redraw everything
// invalidate() just sets this to false right now
// we want to call invalidate() whenever we make a change
	canvasValid = false,
// The node (if any) being selected.
// If in the future we want to select multiple objects, this will get turned into an array
	mySel, actionSel, 
// The selection color and width. Right now we have a red selection with a small width
	mySelColor = '#FF6600',
// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
	offsetx, 
	offsety,
	team = [],
	steps = [],
	CURRENT_STEP = 0;
	
var mouseDown = 0;

function loaded() {
	//prevent default scrolling on document window
	document.addEventListener('touchmove', function(e) {
		e.preventDefault()
	}, false);

	canvas = document.querySelector('#players');
	//check if the browser supports canvas
	if (canvas.getContext) {
		init();
	}else {
		alert('Your browser does not support Canvas 2D drawing, sorry!');
	}
} 

function init() {

    ctx = canvas.getContext('2d');

	$canvas = $('#players');
	$COURT_CANVAS = $('#court');
	//set height and width to size of device window
	var toolbarWidth = document.querySelector('div#left-bar').offsetWidth;
	$canvas.height((window.innerHeight) + "px");
	$canvas.width((window.innerWidth - toolbarWidth) + "px");
	$COURT_CANVAS.height((window.innerHeight) + "px");
	$COURT_CANVAS.width((window.innerWidth - toolbarWidth) + "px");
	$ghostcanvas = $canvas.clone();
	$ghostcanvas.attr("style","");
	$ghostcanvas.attr("id","ghost");
	$CANVAS = $canvas;
	cssScale = [$canvas.width() / $canvas.attr('width'),
				$canvas.height() / $canvas.attr('height')];
	offsetx = document.querySelector("div#right-bar").offsetLeft;
	offsety = document.querySelector("div#right-bar").offsetTop;
	// make draw() fire every INTERVAL milliseconds.
	setInterval(draw, INTERVAL);
	document.querySelector('button#step').addEventListener('click', saveStep, false);
	//document.querySelector('button#animate').addEventListener('animate',animate,false);
    //add touch and mouse event listeners
    canvas.addEventListener('touchstart', onTouchStart, false);
    canvas.addEventListener('mousedown', onMouseDown, false);

	$("a.step").live('click', function(e){
		e.preventDefault();
		var step = $(this).attr("href");
		step = step.replace("#step-","");
		CURRENT_STEP = Number(step);
		animate(CURRENT_STEP);
	});
	$("#actions a").live('click',function(e){
		e.preventDefault();
		action = $(this).attr('id');
		if(action!="cancel"){
			mySel[action](actionSel);
		}
		$('#actions').hide();
	});

	court = new Court();
	court.draw;
	//STARTING 5
	addX(80,185);
	addX(190,75);
	addX(300,240);
	addX(190,425);
	addX(80,315);
	//saveStep();
}

function onTouchStart(e) {
		//SHOULD DRAW A NEW SHAPE IF ONE IS NOT FOUND
		//SHOULD ALSO SET Listeners
		e.preventDefault();
		
        if (e.touches.length == 1) {

                startDraw((e.touches[0].pageX - offsetx) / cssScale[0] , e.touches[0].pageY / cssScale[1]);
                canvas.addEventListener('touchmove', onTouchMove, false);
                canvas.addEventListener('touchend', onTouchEnd, false);
                canvas.addEventListener('touchcancel', onTouchCancel, false);
        }
}

function startDraw(x,y){

	clear($ghostcanvas);

	// run through all the players and see if you clicked on one
	var l = team.length;
	for (var i = l-1; i >= 0; i--) {
		// draw shape onto ghost context		
		team[i].write_to = 1; //SWITCHES TO GHOST
		team[i].draw();
		team[i].write_to = 0; //SWITCHES BACK TO MAIN CANVAS
		// get image data at the mouse x,y pixel
		var imageData = $ghostcanvas[0].getContext('2d').getImageData(x, y, 1, 1);
		var index = (x + y * imageData.width) * 4;
		// if the mouse pixel exists, select and break // THIS IS A CANVAS BUILT IN OPERATION
		if (imageData.data[3] > 0) {
			if(team[i]==mySel){
				mySel = team[i];
				isDrag = true;
			}else if(mySel){
				$("#actions").show();
				actionSel = i;
				return;
			}else{
				mySel = team[i];
				isDrag = true;
			}
			clear($ghostcanvas);
			invalidate();
			return;
		}
	}
	if (teamCount("offense") < 5){ //if($('input[name="player_type"]:checked').val()=="offense"){
		addX(x,y);
	}//ELSE TELL THE USER THERE IS TOO MANY
	// havent returned means we have selected nothing
	mySel = null;
	// clear the ghost canvas for next time
	clear($ghostcanvas);
	// invalidate because we might need the selection border to disappear
	invalidate();
}

function onTouchMove(e) {

        e.preventDefault();
        moveDraw((e.touches[0].pageX - offsetx) / cssScale[0], e.touches[0].pageY / cssScale[1], e.timeStamp);
}

// Happens when the mouse is moving inside the canvas
function moveDraw(x,y,t){
	if (isDrag){
		mySel.x = x;
		mySel.y = y;   
		// something is changing position so we better invalidate the canvas!
		invalidate();
	}
}

function onTouchEnd(e) {

        e.preventDefault();

        if (e.touches.length == 0) {

                endDraw();
                canvas.removeEventListener('touchmove', onTouchMove, false);
                canvas.removeEventListener('touchend', onTouchEnd, false);
                canvas.removeEventListener('touchcancel', onTouchCancel, false);
        }
}

function onTouchCancel(e) {

        canvas.removeEventListener('touchmove', onTouchMove, false);
        canvas.removeEventListener('touchend', onTouchEnd, false);
        canvas.removeEventListener('touchcancel', onTouchCancel, false);

}

function onMouseDown(e) {
        startDraw((e.clientX - offsetx) / cssScale[0], e.clientY / cssScale[1]);
        canvas.addEventListener('mousemove', onMouseMove, false);
        canvas.addEventListener('mouseup', onMouseUp, false);
}

function onMouseMove(e) {
        moveDraw((e.clientX - offsetx) / cssScale[0], e.clientY / cssScale[1], e.timeStamp);
}

function onMouseUp() {
        endDraw();
        canvas.removeEventListener('mousemove', onMouseMove, false);
        canvas.removeEventListener('mouseup', onMouseUp, false);
}

function endDraw() {
	isDrag = false;
}

window.addEventListener("load", loaded, true);

function teamCount(kind){
	return _.select(team, function(t){
		 return t.team == kind;
	}).length;
}

var X = function(){
	this.x = 0;
	this.y = 0;
	this.animating = false;
	this.steps = [];
	this.actions = {};
	this.current_step = 1;
	this.moveHandle = false;
	this.team = "offense";
	this.write_to = 0;
	this.canvas = function(){
		if(this.write_to===0){
			return $CANVAS;
		}else{
			return $ghostcanvas;
		}
	};
	this.strokeStyle = "#000";
	this.strokeWidth = 5;
	this.strokeJoin = "round";
	this.strokeCap = "round";
	this.x1 = function() {
		return this.x + 10;
	};
	this.y1 = function() {
		return this.y + 10;
	};
	this.x2 = function() {
		return this.x - 10;
	};
	this.y2 = function() {
		return this.y - 10;
	};
	this.draw = function() {
		this.canvas().drawRect({
  			strokeStyle: "#000",
  			strokeWidth: 3,
  			fillStyle: "#FFF",
  			x: this.x1() - 10, y: this.y1() - 10,
  			width: 50,
  			height: 50,
  			cornerRadius: 10,
  			fromCenter: true
		});
	  	this.canvas().drawLine({
			strokeStyle: this.strokeStyle,
			strokeWidth: this.strokeWidth,
			strokeCap: this.strokeCap,
			strokeJoin: this.strokeJoin,
			x1: this.x1(), y1: this.y1(),
			x2: this.x2(), y2: this.y2()
		});
	  	this.canvas().drawLine({
			strokeStyle: this.strokeStyle,
			strokeWidth: this.strokeWidth,
			strokeCap: this.strokeCap,
			strokeJoin: this.strokeJoin,
			x1: this.x1(), y1: this.y2(),
			x2: this.x2(), y2: this.y1(),
			fromCenter: true
		});
	};
	this.drawActions = function(){
		var step = CURRENT_STEP;
		if(this.steps[step]){
			var that = this;
			//console.log(this.steps[step].actions.action + " on " + this.steps[step].actions.who);
			if(this.steps[step].actions.action){
				this[this.steps[step].actions.action](this.steps[step].actions.who);
			}else{
				//console.log("action not found: ");
			}
			invalidate();
		}
	};
	this.screen = function(player_num){
		this.canvas().drawLine({
			strokeStyle: "#333",//this.strokeStyle,
			strokeWidth: this.strokeWidth,
			strokeCap: this.strokeCap,
			strokeJoin: this.strokeJoin,
			x1: this.x1(), y1: this.y2(),
			x2: team[player_num].x2(), y2: team[player_num].y1(),
			fromCenter: true
		});
		this.actions = { action : "screen", who : player_num};
	};
	this.pass = function(player_num){
		this.canvas().drawLine({
			strokeStyle: "#FF6600", //COULD USE FILL WITH A DOTTED IMG
			strokeWidth: this.strokeWidth,
			strokeCap: this.strokeCap,
			strokeJoin: this.strokeJoin,
			x1: this.x1(), y1: this.y2(),
			x2: team[player_num].x2(), y2: team[player_num].y1(),
			fromCenter: true
		});
		this.actions = {action : "pass", who : player_num};
	};
};

var O = function (){
	this.x = 0;
	this.y = 0;
	this.steps = [];
	this.current_step = 1;
	this.moveHandle = false;
	this.team = "defense";
	this.write_to = 0;
	this.strokeStyle = "#000";
	this.strokeWidth = 3;
	this.fillStyle = "#FFF";
	this.canvas = function(){
		if(this.write_to===0){
			return $CANVAS;
		}else{
			return $ghostcanvas;
		}
	};
	this.draw = function(){
		this.canvas().drawEllipse({
								  fillStyle: this.fillStyle,
								  strokeStyle: this.strokeStyle,
								  strokeWidth: this.strokeWidth,
								  x: this.x, y: this.y,
								  width: 13, height: 13
								  });
	};
	this.move = function(){
		// or just do it in the animate loop
	};
};

function addX(x, y) {
  var player = new X();
  player.x = x;
  player.y = y;
  team.push(player);
  player.draw();
}

function addO(x, y) {
	var player = new O();
	player.x = x;
	player.y = y;
	team.push(player);
	player.draw();
}

function invalidate() {
	//Helps performance, only draws the canvas while its valid.
	canvasValid = false;
}

function saveStep(){
	var tmpStep = [];
	_.each(team,function(player){
				tmpStep.push({ x :Math.round(player.x), y:Math.round(player.y)});
	});
	steps.push(tmpStep);
	var userStep = Number(CURRENT_STEP) + 1;
	$("#steps").append('<li><a class="step" href="#step-' + CURRENT_STEP + '">' + userStep + '</a></li>');
	$("#player").html("STEP: " + userStep);
	++CURRENT_STEP;
}

function saveStepOLD(){
	var maxStep = 0;
	_.each(team,function(player){
				player.steps.push({ x :Math.round(player.x), y:Math.round(player.y), actions:player.actions});
				player.actions = [];
				++player.current_step;
				//socket.emit('savedStep!', player);
				//if (maxStep < player.current_step){
				//	maxStep = player.current_step;
				//}
	});
	var userStep = Number(CURRENT_STEP) + 1;
	$("#steps").append('<li><a class="step" href="#step-' + CURRENT_STEP + '">' + userStep + '</a></li>');
	$("#player").html("STEP: " + userStep);
	++CURRENT_STEP;
}

function getStepData(step){
	_.each(step,function(teamer){
		   $("body").append("<br/>" + teamer.x + " " + teamer.y);
	});
}

function animate(step){
	mySel = null;
	_.each(team, function(player, player_num){
		   var x = player.x - offsetx;
		   var y = player.y - offsety;
		   var end_x = player.steps[step].x;//first one in step is X
		   var end_y = player.steps[step].y;//second on in step is y
		   var spot_x = x;
		   var spot_y = y;
		   var change_x = 10;
		   var change_y = 10;
		   function move(){
				if((player.x != end_x) || (player.y != end_y)){
					player.animating = true;
					$("#player").html("draw cause " + player.x + " " + end_x + " " + player.y + " " + end_y);
					//If difference in distance from final spots are unequal we need to move in a diagnol line
					var diff_x = Math.abs(player.x - end_x);
					var diff_y = Math.abs(player.y - end_y);
					if (diff_x < 10){
						change_x = diff_x;
					}
					if (diff_y < 10){
						change_y = diff_y;
					}		   
					if (player.x > end_x){
						player.x = player.x - change_x;
					}
					if (player.x < end_x){
						player.x = player.x + change_x;
					}
					if (player.y > end_y){
						player.y = player.y - change_y;
					}
					if (player.y < end_y){
						player.y = player.y + change_y;
					}
					draw();
					canvasValid = false;
				}else{
					var userStep = Number(step) + 1;
					$("#player").html("STEP: " + userStep);
					clearInterval(player.moveHandle);
					player.animating = false;
				}
		   }
		   player.moveHandle = setInterval(move,10);
		   });
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function draw(actions) {
	if (canvasValid == false) {
		$canvas.clearCanvas();
		// draw all boxes
		var l = team.length;
		for (var i = 0; i < l; i++) {
			if (team[i] == mySel){
				team[i].strokeStyle = mySelColor;
			}else{
				//change to reset method eventually
				team[i].strokeStyle = "#000";
			}
			if(playersMoving()){
				team[i].draw();
			}else{
				//console.log("draw actions");
				team[i].draw();
				team[i].drawActions();
			}
		}
		canvasValid = true;
	}
}

function playersMoving(){
	moving = false;
	_.each(team, function(player){
		if(player.animating || isDrag){
			moving = true;
		};
	});
	return moving;
}

function copyCtx(){
	ctx1 = $("canvas:first")[0].getContext('2d');
	ctx2 = $("canvas:last")[0].getContext('2d');
	var src = $("canvas:first")[0].toDataURL("image/png");
	var img = document.createElement('img'); // create a Image Element
    img.src = src;   //image source
    ctx2.drawImage(img, 0, 0);
	$("body").append(img);	
}
function clear(c) { //NEED TO FIX HEIGHT AND WIDTH 
	c[0].getContext('2d').clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function Court(){
	var kind = "college";//$('input[name="court_type"]:checked').val();
	var type = {
		nba : {
			length : 94,
			width : 50,
			laneWidth : 16,
			laneHeight : 15, //THIS IS FROM THE HOOP, NOT FROM THE BASELINE
			laneHeightFromBaseline : 18.83, //18ft10in
			threeLength : 23.75, //23ft 9in
			hoop : 4, //4ft from baseline
			hoopCenter : function(){return this.width / 2;}   
		},
		college : {
			length : 84,
			width : 50,
			laneWidth : 12,
			laneHeight : 15, //THIS IS FROM THE HOOP, NOT FROM THE BASELINE
			laneHeightFromBaseline : 18.83, //18ft10in
			threeLength : 20.75, //20ft 9in
			hoop : 4, //4ft from baseline
			hoopCenter : function(){return this.width / 2;}
		},
		hs : {
			length : 84,
			width : 50,
			laneWidth : 12,
			laneHeight : 15, //THIS IS FROM THE HOOP, NOT FROM THE BASELINE
			laneHeightFromBaseline : 18.83, //18ft10in
			threeLength : 19.75, //19ft 9in
			hoop : 4, //4ft from baseline
			hoopCenter : function(){return this.width / 2;}
		}	
	};
	function append() {
		$COURT_CANVAS.clearCanvas();
		$COURT_CANVAS.drawRect({
		  strokeStyle: "#000",
		  strokeWidth: 3,
		  x: 3,
		  y: 3,
		  width: type[kind].length * 10,
		  height: type[kind].width * 10,
		  cornerRadius: 1,
		  fromCenter: false
		});
		//console.log((type[kind].width / 2) * 10 - (type[kind].laneWidth / 2));
		$COURT_CANVAS.drawLine({ //TOP FREE THROW
							 strokeStyle: "#000",
							 strokeWidth: 3,
							 strokeCap: "round",
							 strokeJoin: "round",
							 x1: 3, y1: ((type[kind].width / 2) - (type[kind].laneWidth / 2)) * 10,
							 x2: type[kind].laneHeightFromBaseline * 10, y2: ((type[kind].width / 2) - (type[kind].laneWidth / 2)) * 10
		});
		$COURT_CANVAS.drawLine({ //BOTTOM FREE THROW
						 strokeStyle: "#000",
						 strokeWidth: 3,
						 strokeCap: "round",
						 strokeJoin: "round",
						 x1: 3, y1: ((type[kind].width / 2) + (type[kind].laneWidth / 2)) * 10,
						 x2: type[kind].laneHeightFromBaseline * 10, y2: ((type[kind].width / 2) + (type[kind].laneWidth / 2)) * 10,
						 x3: type[kind].laneHeightFromBaseline * 10, y3: ((type[kind].width / 2) - (type[kind].laneWidth / 2)) * 10
						 });
		$COURT_CANVAS.drawArc({ //Free throw circle
							strokeStyle: "#000",
							strokeWidth: 3,
							x: type[kind].laneHeightFromBaseline * 10, 
							y: ((type[kind].width / 2) + (type[kind].laneWidth / 2)) * 10 - (type[kind].laneWidth * 5),
							radius: type[kind].laneWidth / 2 * 10,
							fromCenter: true,
							start: 0, end: 180 //180 is half
						});
		$COURT_CANVAS.drawArc({ //3 Point Line
						strokeStyle: "#000",
						strokeWidth: 3,
						x: (type[kind].hoop) * 10 + 3, 
						y: ((type[kind].width / 2) + (type[kind].laneWidth / 2)) * 10 - (type[kind].laneWidth * 5),
						radius: (type[kind].threeLength) * 10 + 10,
						fromCenter: true,
						start: 0, end: 180
						});
		$COURT_CANVAS.drawLine({ //BACKBOARD
						 strokeStyle: "#000",
						 strokeWidth: 3,
						 strokeCap: "round",
						 strokeJoin: "round",
						 x1: (type[kind].hoop) * 10 + 3, y1: (type[kind].width / 2) * 10 - 15,
						 x2: (type[kind].hoop) * 10 + 3, y2: (type[kind].width / 2) * 10 + 15
						 });
		$COURT_CANVAS.drawArc({ //HOOP
						strokeStyle: "#000",
						strokeWidth: 3,
						x: (type[kind].hoop) * 10 + 3 + 10, 
						y: (type[kind].width / 2) * 10,
						radius: 10,
						fromCenter: true,
						start: 0, end: 360
						});
	}
	this.draw = append();
}

function drawCourt(){
	court_type = 'college'; //$('input[name="court_type"]:checked').val();
	$COURT_CANVAS.clearCanvas();
	$COURT_CANVAS.drawRect({
					 strokeStyle: "#000",
					 strokeWidth: 3,
					 x: 3, y: 3,
					 width: Court[court_type].length * 10,
					 height: Court[court_type].width * 10,
					 cornerRadius: 1,
 					 fromCenter: false
    });  
}