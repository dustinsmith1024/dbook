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
	mySel, 
// The selection color and width. Right now we have a red selection with a small width
	mySelColor = '#FF6600',
// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
	offsetx, 
	offsety,
	team = [],
	steps = [],
	toolbarWidth = 0;
	
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
	toolbarWidth = document.querySelector('div#left-bar').offsetWidth;
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
	
	// make draw() fire every INTERVAL milliseconds.
	setInterval(draw, INTERVAL);
	document.querySelector('button#step').addEventListener('click', saveStep, false);
	document.querySelector('button#animate').addEventListener('animate',animate,false);
    //add touch and mouse event listeners
    canvas.addEventListener('touchstart', onTouchStart, false);
    canvas.addEventListener('mousedown', onMouseDown, false);
		
	//***********
	/*
		Make the menu bar float on the left side
	  	ADD IN LISTENERS FOR THE SAVE STEPS
	*/
	//**************///
	//$('input[name="court_type"]').change(function(){
	//									 court = new Court();
	//									 court.draw;
	//});
	$("a.step").live('click', function(){
									 var step = $(this).attr("href");
									 step = step.replace("#step-","");
									 animate(step);
						   });

        //event listener for application cache updates
      //  window.applicationCache.addEventListener('onupdateready', updateCache, false);
        	// add custom initialization here:
	court = new Court();
	console.log(court);
	court.draw;

}

function onTouchStart(e) {
		//SHOULD DRAW A NEW SHAPE IF ONE IS NOT FOUND
		//SHOULD ALSO SET Listeners
		e.preventDefault();

        if (e.touches.length == 1) {

                startDraw(e.touches[0].pageX / cssScale[0] , e.touches[0].pageY / cssScale[1]);
                //alert(e.touches[0].pageX);
                canvas.addEventListener('touchmove', onTouchMove, false);
                canvas.addEventListener('touchend', onTouchEnd, false);
                canvas.addEventListener('touchcancel', onTouchCancel, false);
        }
}

function startDraw(x,y){
	x = x  - toolbarWidth;
	clear($ghostcanvas);
	// run through all the boxes
	var l = team.length;
	for (var i = l-1; i >= 0; i--) {
		// draw shape onto ghost context		
		team[i].write_to = 1; //SWITCHES TO GHOST
		team[i].draw();
		team[i].write_to = 0; //SWITCHES BACK TO MAIN CANVAS
		// get image data at the mouse x,y pixel
		var imageData = $ghostcanvas[0].getContext('2d').getImageData(x, y, 1, 1);
		var index = (x + y * imageData.width) * 4;
		// if the mouse pixel exists, select and break
		if (imageData.data[3] > 0) {
			mySel = team[i];
			console.log(i);
			offsetx = x - mySel.x;
			offsety = y - mySel.y;
			mySel.x = x - offsetx;
			mySel.y = y - offsety;
			console.log(mouseDown);
			isDrag = true;
			clear($ghostcanvas);
			invalidate();
			return;
		}
	}
	if($('input[name="player_type"]:checked').val()=="offense"){
		if (teamCount("offense") < 5){
			addX(x,y); //NEED TOGGLES FOR WHICH ON WE WANT TO DRAW
		}//ELSE TELL THE USER THERE IS TOO MANY
	}else{
		if (teamCount("defense") < 5){
			addO(x,y);
		}//ELSE TELL THE USER THERE IS TOO MANY
	}
	// havent returned means we have selected nothing
	mySel = null;
	// clear the ghost canvas for next time
	clear($ghostcanvas);
	// invalidate because we might need the selection border to disappear
	invalidate();
}

function onTouchMove(e) {

        e.preventDefault();
        moveDraw(e.touches[0].pageX / cssScale[0], e.touches[0].pageY / cssScale[1], e.timeStamp);
}

// Happens when the mouse is moving inside the canvas
function moveDraw(x,y,t){
	if (isDrag){	
		//var x = e.pageX / cssScale[0] - $CANVAS[0].offsetLeft;
		//var y = e.pageY / cssScale[1] - $CANVAS[0].offsetTop;
		mySel.x = x - offsetx;
		mySel.y = y - offsety;   
		// something is changing position so we better invalidate the canvas!
		invalidate();
	}
}

function onTouchEnd(e) {

        e.preventDefault();

        if (e.touches.length == 0) {

                endDraw(e.changedTouches[0].pageX, e.changedTouches[0].pageY);
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
        startDraw(e.clientX / cssScale[0], e.clientY / cssScale[1]);
        canvas.addEventListener('mousemove', onMouseMove, false);
        canvas.addEventListener('mouseup', onMouseUp, false);
}

function onMouseMove(e) {
        moveDraw(e.clientX / cssScale[0], e.clientY / cssScale[1], e.timeStamp);
}

function onMouseUp(e) {
        endDraw(e.clientX, e.clientY);
        canvas.removeEventListener('mousemove', onMouseMove, false);
        canvas.removeEventListener('mouseup', onMouseUp, false);
}

function endDraw(x,y) {
	isDrag = false;
}

window.addEventListener("load", loaded, true);

function teamCount(kind){
	return _.select(team, function(t){
		 return t.team == kind;
	}).length;
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

var X = function(){
	this.x = 0;
	this.y = 0;
	this.steps = [];
	this.current_step = 0;
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
};

var O = function (){
	this.x = 0;
	this.y = 0;
	this.steps = [];
	this.current_step = 0;
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
	var maxStep = 0;
	_.each(team,function(player){
				player.steps.push([player.x,player.y]);
				++player.current_step;
                socket.emit('savedStep!', player);
				if (maxStep < player.current_step){
					maxStep = player.current_step;
				}
		   });
		$("#steps").append('<li><a class="step" href="#step-' + maxStep + '">' + maxStep + '</a></li>');
}

function saveStep2(teamer){
	where = steps.length;
	steps[where] = [];
	console.log(teamer[0]);
	_.each(teamer, function(teamy){
		   if(teamy.team == "offense"){
				var tmp = new X();
		   }else{
				var tmp = new O();
		   }
		   tmp.x = teamy.x;
		   tmp.y = teamy.y;
		   steps[where].push(tmp);
	});//Push the team onto this step  	
}

function getStepData(step){
	_.each(step,function(teamer){
		   $("body").append("<br/>" + teamer.x + " " + teamer.y);
		   });
}

function animate(step){
	if(!step){ step=1; }
	_.each(team, function(player, player_num){
		   var x = player.x;
		   var y = player.y;
		   var end_x = player.steps[step - 1][0];//first one in step is X
		   var end_y = player.steps[step - 1][1];//second on in step is y
		   var spot_x = x;
		   var spot_y = y;
		   function move(){
				if(player.x != end_x || player.y != end_y){
					console.log("draw!");
					//If difference in distance from final spots are unequal we need to move in a diagnol line
					var diff_x = Math.abs(player.x - end_x);
					var diff_y = Math.abs(player.y - end_y);
					if (diff_x > diff_y){
						//console.log(diff_x / diff_y);
					}
					if (diff_x < diff_y){
						//console.log(diff_y / diff_x);
					}		   
					if (player.x > end_x){
						--player.x;
					}
					if (player.x < end_x){
						++player.x;
					}
					if (player.y > end_y){
						--player.y;
					}
					if (player.y < end_y){
						++player.y;
					}
					draw();
					canvasValid = false;
				}else{
					clearInterval(player.moveHandle);
				}
		   }
		   player.moveHandle = setInterval(move,10);
		   });
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function draw() {
	//console.log(
	if (canvasValid == false) {
		$canvas.clearCanvas();
		// Add stuff you want drawn in the background all the time here
		//c = new Court();
		//court.draw;
		// draw all boxes
		var l = team.length;
		for (var i = 0; i < l; i++) {
			if (team[i] == mySel){
				team[i].strokeStyle = mySelColor;
			}else{
				//change to reset method eventually
				team[i].strokeStyle = "#000";
			}
			team[i].draw();
		}
		// Add stuff you want drawn on top all the time here
		canvasValid = true;
	}
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

function myDown(e){
	e.preventDefault();
	//getMouse(e);
	//if (e.touches.length == 1) {
    //startDraw(e.touches[0].pageX, e.touches[0].pageY);

	if(e.touches){
		var x = e.touches[0].pageX / cssScale[0] - $CANVAS[0].offsetLeft;
		var y = e.touches[0].pageY / cssScale[1] - $CANVAS[0].offsetTop;
    	alert(x);
    }else{
		var x = e.pageX / cssScale[0] - $CANVAS[0].offsetLeft;
		var y = e.pageY / cssScale[1] - $CANVAS[0].offsetTop;
    }
	clear($ghostcanvas);
	// run through all the boxes
	var l = team.length;
	for (var i = l-1; i >= 0; i--) {
		// draw shape onto ghost context		
		team[i].write_to = 1; //SWITCHES TO GHOST
		team[i].draw();
		team[i].write_to = 0; //SWITCHES BACK TO MAIN CANVAS
		// get image data at the mouse x,y pixel
		var imageData = $ghostcanvas[0].getContext('2d').getImageData(x, y, 1, 1);
		var index = (x + y * imageData.width) * 4;
		// if the mouse pixel exists, select and break
		if (imageData.data[3] > 0) {
			mySel = team[i];
			console.log(i);
			offsetx = x - mySel.x;
			offsety = y - mySel.y;
			mySel.x = x - offsetx;
			mySel.y = y - offsety;
			console.log(mouseDown);
			isDrag = true;
			$canvas.bind("touchmove mousemove", function(event){ myMove(event);});
			clear($ghostcanvas);
			invalidate();
			return;
		}
	}
	if($('input[name="player_type"]:checked').val()=="offense"){
		if (teamCount("offense") < 5){
			addX(x,y); //NEED TOGGLES FOR WHICH ON WE WANT TO DRAW
		}//ELSE TELL THE USER THERE IS TOO MANY
	}else{
		if (teamCount("defense") < 5){
			addO(x,y);
		}//ELSE TELL THE USER THERE IS TOO MANY
	}
	// havent returned means we have selected nothing
	mySel = null;
	// clear the ghost canvas for next time
	clear($ghostcanvas);
	// invalidate because we might need the selection border to disappear
	invalidate();
}

function clear(c) { //NEED TO FIX HEIGHT AND WIDTH 
	c[0].getContext('2d').clearRect(0, 0, window.innerWidth, window.innerHeight);
} 

// adds a new node
function myDblClick(e) {
	e.preventDefault();
	//console.log("dblClick");
	var x = e.pageX / cssScale[0] - $CANVAS[0].offsetLeft;
	var y = e.pageY / cssScale[1] - $CANVAS[0].offsetTop;
	if($('input[name="player_type"]:checked').val()=="offense"){
		console.log("Draw X");
		if (teamCount("offense") < 5){
			addX(x,y); //NEED TOGGLES FOR WHICH ON WE WANT TO DRAW
		}//ELSE TELL THE USER THERE IS TOO MANY
	}else{
		if (teamCount("defense") < 5){
			addO(x,y);
		}//ELSE TELL THE USER THERE IS TOO MANY
	}
}

// Happens when the mouse is moving inside the canvas
function myMove(e){
    e.preventDefault();
	if (isDrag){
		//getMouse(e);
		console.log(e.pageX);
		console.log(e.pageY);
		var x = e.pageX - toolbarWidth / cssScale[0] - $CANVAS[0].offsetLeft;
		var y = e.pageY / cssScale[1] - $CANVAS[0].offsetTop;
		
		mySel.x = x - offsetx;
		mySel.y = y - offsety;   

		// something is changing position so we better invalidate the canvas!
		invalidate();
	}
}

function myUp(){
	console.log("myUp!");
	isDrag = false;
	$canvas.bind("touchmove mousemove", function(){});
}
