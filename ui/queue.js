var QueueApp = {
	init: function () {
		this.canvas = Raphael("canvas", 600, 400);
		
		// File menu
		$( "#new_file" ).button({text: false, icons: {primary: "ui-icon-document"}})
		.click(function () {
			QueueApp.reset();
		});
		$( "#load_file" ).button({text: false, icons: {primary: "ui-icon-folder-open"}});
		$( "#save_file" ).button({text: false,icons: {primary: "ui-icon-disk"}})
		.click(function () {
			QueueApp.save();
		});
		$("#file_ops").buttonset();
		
		// Add elements menu
		$("#new_server").button({icons: {primary: "ui-icon-plus"}}).click(function () {
			QueueApp.newServer();
		});
		$("#new_source").button({icons: {primary: "ui-icon-plus"}}).click(function () {
			QueueApp.newSource();
		});
		$("#new_splitter").button({icons: {primary: "ui-icon-plus"}});
		$("#new_monitor").button({icons: {primary: "ui-icon-plus"}});
		$("#connect").button({icons: {primary: "ui-icon-arrowthick-2-se-nw"}})
		.click(function () {
			QueueApp.toggleConnections();
		});
		$("#new_ops").buttonset();
		
		// Simulation menu
		$("#play_sim").button({icons: {primary: "ui-icon-play"}}).click(function () {
			$("#progressbar").toggle();
			$("#sim_play_ops").toggle();
			$("#new_ops").toggle();
			$("#file_ops").toggle();
			$("#sim_ops").toggle();
			
			QueueApp.startSim();
		});
		$("#config_sim").button({icons: {primary: "ui-icon-clock"}}).click(function () {
			$("#server_form").dialog('open');
		});
		$("#sim_ops").buttonset();
		
		$("#pause_sim").button({text: false, icons: {primary: "ui-icon-pause"}}).click(function () {
			if (QueueApp.paused) {
				QueueApp.paused = false;
				QueueApp.run();
			} else {
				QueueApp.pauseSim();
			}
		});
		$("#stop_sim").button({text: false, icons: {primary: "ui-icon-stop"}}).click(function () {
			$("#progressbar").toggle();
			$("#sim_play_ops").toggle();
			$("#new_ops").toggle();
			$("#file_ops").toggle();
			$("#sim_ops").toggle();
		});
		
		$("#sim_play_ops").buttonset().hide();
		this.progress = $("#progressbar");
		this.progress.progressbar().hide();
		
		$("#server_form").dialog({
			autoOpen: false,
			height: 250,
			width: 250,
			modal: false,
			resizable: false,
			buttons: {
				'Delete this server': function () {
					
				},
				'Save': function () {
					
				}
			},
			open: function() {
				var $buttonPane = $(this).parent();
				$buttonPane.find('button:first')
				.css({'color': 'red', 'margin-right': '55px'})
				.button({icons: {primary:'ui-icon-trash'}});
			}
		});
	},
	
	reset: function () {
		this.sim = null;
		this.showConn = false;
		this.server_id = 0;
		this.source_id = 0;
		this.splitter_id = 0;
		this.monitor_id = 0;
		
		this.canvas.clear();
		var rect = this.canvas.rect(0, 0, 600, 400);
		rect.attr('fill', '#FFE87C');
		this.posx = 50;
		this.posy = 50;
		this.views = [];
		this.models = [];
	},
	
	updateDrop: function () {
		this.posx += 20;
		this.posy += 20;
		if (this.posy > 360) {
			this.posy = 20;
			this.posx -= 200;
		}
	},
	
	newView: function (ViewFn, ModelFn, type, name, hasIn, hasOut) {
		var obj = new ViewFn(this.canvas, type, name, this.posx, this.posy, true, true);
		if (this.showConn) obj.showDots(true);
		this.views.push(obj);
		this.updateDrop();
		
		var model = new ModelFn(obj);
		obj.model = model;
		this.models.push(model);
		return obj;
	},
	
	newServer: function () {
		this.server_id++;
		return this.newView(ImageView, ServerModel, 'queue', 'queue_' + this.server_id, true, true);
	},
	
	newSource: function () {
		this.source_id++;
		return this.newView(ImageView, SourceModel, 'source', 'source_' + this.source_id, false, true);		
	},
	
	newSplitter: function () {
		
	},
	
	newMonitor: function () {
		
	},
	
	toggleConnections: function () {
		this.showConn = !this.showConn;
		var len = this.views.length;
		for (var i = len - 1; i >= 0; i--) {
			var obj = this.views[i];
			obj.showDots(this.showConn);
		}
	},
	
	save: function () {
		var str = this.stringify();
		console.log(str);
	},
	
	load: function (text) {
		var json = JSON.parse(text);
		var len = json.length;
		var dict = {};
		for (var i = len - 1; i >= 0; i--) {
			var conf = json[i];
			var obj = null;

			if (conf.type === 'queue') {
				obj = this.newServer();
			} else if (conf.type === 'source') {
				obj = this.newSource();
			}
			
			obj.moveto(conf.x, conf.y);
			obj.name = conf.name;
			dict[conf.name] = obj;
		}
		
		for (var i = len - 1; i >= 0; i--) {
			var conf = json[i];
			if (conf.out) {
				var from = dict[conf.name];
				var to = dict[conf.out];
				
				from.connect(to);
			}
		}
	},
	
	stringify: function () {
		var str = [];
		var len = this.views.length;
		for (var i = len - 1; i >= 0; i--) {
			str.push(this.views[i].jsonify());
		}
		return JSON.stringify(str);
	},
	
	parse: function (json) {
		
	},

	startSim: function () {
		var len, i, model;
		this.sim = new Sim();
		this.random = new Random(1234);
		
		len = this.models.length;
		for (i = len - 1; i >= 0; i --) {
			this.models[i].start();
		}
		
		for (i = len - 1; i >= 0; i --) {
			this.models[i].connect();
		}
		
		this.sim.setLogger(function (msg) {
			console.log(msg);
		});
		
		this.playing = true;
		this.paused = false;
		this.until = 50000;
		this.startedAt = new Date().getTime();
		this.run();
	},
	
	pauseSim: function () {
		this.paused = true;
	},

	IntervalLow: 40,
	Interval: 50,
	IntervalHigh: 60,
	EventsPerInterval: 100,
	IntervalPause: 0,

	run: function () {
		var app = QueueApp;
		var start = new Date().getTime();
		var completed = app.sim.simulate(app.until, app.EventsPerInterval);
		var end = new Date().getTime();
		
//		sp.simTimeDisplay.text(sp.sim.time());
//		var eventsPerSec = sp.EventsPerInterval / (end - start) * 1000;
//		sp.eventsSecDisplay.text(end - sp.startedAt);
	//	sp.eventsSecDisplay.append([end-start, end-sp.startedAt, sp.EventsPerInterval, "]"].join(", "));
		
		var diff = end - start;
		if (diff < app.IntervalLow || diff > app.IntervalHigh) {
			app.EventsPerInterval = Math.floor(app.EventsPerInterval / diff * app.Interval);
		}
		
		app.progress.progressbar({value: app.sim.time() * 100 / app.until});
		
		if (completed) {
			console.log("completed " + app.sim.time());
			return;
		}
		
		if (!app.playing) {
//			if (app.callback) sp.callback(sp.STOP);
			return;
		}
		
		if (app.paused) {
//			if (app.callback) app.callback(sp.PAUSE);
			return;
		}
		
		setTimeout(app.run, app.IntervalPause);
	}
	
};
/*****************************************************************/
Raphael.fn.connection = function (obj1, obj2, line, bg) {
    if (obj1.line && obj1.from && obj1.to) {
        line = obj1;
        obj1 = line.from;
        obj2 = line.to;
    }

	 var bb1 = obj1.getBBox(),
	        bb2 = obj2.getBBox(),
			x1 = bb1.x + bb1.width + 1,
			y1 = bb1.y + bb1.height / 2,
			x4 = bb2.x - 1,
			y4 = bb2.y + bb2.height / 2,
			res = [3, 6];

    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
    var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
    if (line && line.line) {
        line.bg && line.bg.attr({path: path});
        line.line.attr({path: path});
    } else {
        var color = typeof line == "string" ? line : "#000";
        return {
            bg: bg && bg.split && this.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
            line: this.path(path).attr({stroke: color, fill: "none"}),
            from: obj1,
            to: obj2
        };
    }
};


/***************************************************/
var ImageView = function (canvas, type, name, x, y, hasIn, hasOut) {
	this.canvas = canvas;
	this.type = type;
	this.name = name;
	if (type === 'queue') {
		this.image = canvas.image('images/server.png', x, y, 116, 55);
		this.width = 116;
		this.height = 55;
	} else if (type === 'source') {
		this.image = canvas.image('images/customers.png', x, y, 34, 34);
		this.width = 34;
		this.height = 34;
	} else if (type === 'monitor') {
		
	}
	this.x = x;
	this.y = y;

	this.image.attr({cursor: 'move'});	
	this.image.view = this;
	this.image.animate({scale: "1.2 1.2"}, 200, function () {
		this.animate({scale: "1 1"}, 200);		
	});
	
	this.indot = null;
	this.outdot = null;
	
	if (hasIn) {
		this.indot = canvas.circle(x, y, 4);
		this.indot.attr({fill: "#b33"});
		this.indot.view = this;
		this.indot.hide();
	}
	
	if (hasOut) {
		var out = canvas.circle(x, y, 4);
		out.attr({fill: "#3b3"});
		out.view = this;
		out.hide();
		out.drag(
			function (dx, dy) {
				this.attr({cx: this.ox + dx, cy: this.oy + dy});
				this.paper.connection(this.conn);
			}, 
			function () {
				this.conn = this.paper.connection(this.view.image, this, "#000");
				this.ox = this.attr("cx");
				this.oy = this.attr("cy");
			},
			function () {
				this.conn.line.remove();
				this.conn = null;
				
				var views = QueueApp.views;
				var len = views.length;
				var x = this.attr('cx'),
				var y = this.attr('cy');
				
				for (var i = len - 1; i >= 0; i--) {
					var obj = views[i];
					if (obj.acceptDrop(x, y)) {
						this.hide();
						this.view.connect(to);
						return;
					}
				}

				var view = this.view;
			});
		this.outdot = out;
	}

	
	// move
	this.moveto(x, y);

	// Set up event listeners	
	this.image.drag(
		function (dx, dy) {
			var view = this.view;
			view.moveto(view.ox + dx, view.oy + dy);
		},
		function () {
			var view = this.view;
			view.ox = view.x;
			view.oy = view.y;
		}, 
		function () {

		});
}

ImageView.prototype.moveto = function (x, y) {
	var len, i, dot;
	
	if (x > 600 - this.width || y > 400 - this.height || x < 0 || y < 0) {
		return;
	}
	
	this.x = x;
	this.y = y;
	
	this.image.attr({x: x, y: y});
	if (this.indot) {
		this.indot.attr({cx: this.x - 2, cy: this.y + this.height / 2});
		
		var len = QueueApp.views.length;
		for (var i = len - 1; i >= 0; i--) {
			QueueApp.views[i].moveConnection(this);
		}
	}
	
	if (this.outdot) {
		this.outdot.attr({cx: this.x + this.width + 2, cy: this.y + this.height / 2});
		
		if (this.outdot.conn) {
			this.canvas.connection(this.outdot.conn);
		}
	}
};

ImageView.prototype.showDots = function (show) {
	if (this.indot) {
		if (show) this.indot.show(); else this.indot.hide();
	}
	
	if (this.outdot) {
		if (show && !this.outdot.conn) this.outdot.show(); else this.outdot.hide();
	}
};

ImageView.prototype.connect = function (to) {
	var conn = this.canvas.connection(this.image, to.dropObject(), "#000");
	conn.line.attr({'stroke-width': 3});
	conn.fromView = this;
	conn.toView = to;
	this.outdot.conn = conn;
	this.model.dest = to.model;
};

ImageView.prototype.dropObject = function () {
	return this.image;
};

ImageView.prototype.acceptDrop = function (x, y) {
	var cx = this.x - 2;
	var cy = this.y + this.height / 2;
	
	return ((cx - x) * (cx - x) + (cy - y) * (cy - y) < 16);
};

ImageView.prototype.moveConnection = function (dest) {
	if (this.outdot && this.outdot.conn && this.outdot.conn.toView === dest) {
		this.canvas.connection(this.outdot.conn);
	}
};

ImageView.prototype.deleteConnection = function (peer) {
	
};

ImageView.prototype.jsonify = function () {
	var json = {
		x: this.x, 
		y: this.y,
		type: this.type,
		name: this.name};
	
	if (this.outdot && this.outdot.conn) {
		json.out = this.outdot.conn.toView.name;
	}
	
	if (this.model) {
		json.model = this.model.jsonify();
	}
	
	return json;
};

/***************************************************/

function ServerModel(view) {
	this.view = view;
	this.nservers = 1;
	this.mu = 0.5;
	this.infinite = true;
	this.maxqlen = 0;
	
	this.entity = null;
	this.dest = null;
}

ServerModel.prototype.jsonify = function () {
	return {
		nservers: this.nservers,
		mu: this.mu,
		infinite: this.infinite,
		maxqlen: this.maxqlen
	};
};

ServerModel.prototype.start = function () {
	this.entity = QueueApp.sim.addEntity(ServerEntity, this.nservers, this.mu);
	
};

ServerModel.prototype.connect = function () {
	if (this.dest) {
		this.entity.dest = this.dest.entity;
	}
};

function SourceModel(view) {
	this.view = view;
	this.lambda = 1.0;
	this.dest = null;
}

SourceModel.prototype.jsonify = function () {
	return {
		lambda: this.lambda
	};
};

SourceModel.prototype.start = function () {
	this.entity = QueueApp.sim.addEntity(SourceEntity, this.lambda);
};

SourceModel.prototype.connect = function () {
	if (this.dest) {
		this.entity.dest = this.dest.entity;
	}
};

/***************************************************/

var ServerEntity = {
	start: function (nservers, mu) {
		this.mu = mu;
		this.facility = new Sim.Facility('queue');
	},

	arrive: function (from) {
		var duration = QueueApp.random.exponential(this.mu);
		var ro = this.useFacility(this.facility, duration);
		if (this.dest) {
			ro.done(this.dest.arrive, this.dest, this);
		}
	}
};

var SourceEntity = {
	start: function (lambda) {
		this.lambda = lambda;
		this.setTimer(0).done(this.traffic);
	},
	
	traffic: function () {
		if (!this.dest) return;

		var duration = QueueApp.random.exponential(this.lambda);

		this.setTimer(duration)
		.done(this.dest.arrive, this.dest, this)
		.done(this.traffic);
	}
};