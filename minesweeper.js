


function Board (width, height) {
  this.width = width;
  this.height = height;
  this.cells = [];

  this.populate_n = function (num_mines) {
    this.num_mines = num_mines;

    this.init(this.n_dist());
  }

  this.populate_p = function (mine_prob) {
    this.mine_prob = mine_prob;

    this.init(this.p_dist());
  }

  this.init = function (mine_dist) {
    for (var i = 0; i < mine_dist.length; i++) {
      this.cells.push(new Cell(null, mine_dist[i] ? 'mine' : null, false, false));
    }
    this.for_each_cell(function (r, c, cell, board) {
        cell.name = board.cell_name(r, c);
        if (cell.state != 'mine') {
          var count = 0;
          board.for_each_neighbor(r, c, function (r, c, neighb, board) {
              if (neighb.state == 'mine') {
                count++;
              }
            });
          cell.state = count;
        }
      });
  }

  this.uncover = function (r, c) {
    var cell = this.get_cell(r, c);
    if (!cell.visible) {
      cell.visible = true;

      if (cell.state == 'mine') {
        return false;
      } else {
        if (cell.state == 0) {
          this.for_each_neighbor(r, c, function (r, c, neighb, board) {
              board.uncover(r, c);
            });
        }
        return true;
      }
    }
  }

  this.flag = function (r, c) {
    this.get_cell(r, c).flagged = true;
  }

  this.cell_ix = function (r, c) {
    return r * this.width + c;
  }

  this.get_cell = function (r, c) {
    return this.cells[this.cell_ix(r, c)];
  }

  this.num_cells = function () {
    return this.width * this.height;
  }

  this.adjacent = function (r, c) {
    var adj = [];
    for (var _r = Math.max(r - 1, 0); _r <= Math.min(r + 1, height - 1); _r++) {
      for (var _c = Math.max(c - 1, 0); _c <= Math.min(c + 1, width - 1); _c++) {
        if (_r != r || _c != c) {
          adj.push({ix: {r: _r, c: _c}, cell: this.get_cell(_r, _c)});
        }
      }
    }
    return adj;
  }

  this.n_dist = function () {
    m = [];
    for (var i = 0; i < this.num_cells(); i++) {
      m[i] = [Math.random(), (i < this.num_mines)];
    }
    m.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 0; i < this.num_cells(); i++) {
      m[i] = m[i][1];
    }    
    return m;
  }

  this.p_dist = function () {
    m = [];
    for (var i = 0; i < this.num_cells(); i++) {
      m[i] = (Math.random() < this.mine_prob);
    }
    return m;
  }

  this.cell_name = function (r, c) {
    var pad_to = function (i, max) { return pad(i, ('' + max).length); };
    return pad_to(r, this.height) + '-' + pad_to(c, this.width);
  }

  this.safe_cell = function () {
    var c = [];
    this.for_each_cell(function (r, c, cell, board) {
        if (cell.state != 'mine') {
          c.push([r, c]);
        }
      });
    return c[Math.floor(Math.random() * c.length)];
  }

  this.cell_dim = function (canvas) {
    return Math.min(canvas.height / this.height, canvas.width / this.width);
  }

  this.render = function (canvas, params) {
    params = params || {};

    this.for_each_cell(function (r, c, cell, board) {
        cell.render(board.geom(r, c, canvas), canvas.getContext('2d'), params);
      });
  }

  this.render_overlay = function(r, c, fill, canvas) {
    this.get_cell(r, c).render_overlay(this.geom(r, c, canvas), fill, canvas.getContext('2d'));
  }

  this.geom = function (r, c, canvas) {
    var dim = this.cell_dim(canvas);
    var cell_width = dim - MARGIN;
    var corner = [c * dim, r * dim];
    var center = [corner[0] + .5 * cell_width, corner[1] + .5 * cell_width];
    return {span: cell_width, corner: corner, center: center};
  }

  this.cell_from_xy = function (p, canvas) {
    var dim = this.cell_dim(canvas);
    var r = Math.floor(p.y / dim);
    var c = Math.floor(p.x / dim);
    if (r >= 0 && r < this.height && c >= 0 && c < this.width) {
      var g = this.geom(r, c, canvas);
      var inside = (p.x - g.corner[0] < g.span && p.y - g.corner[1] < g.span);
      return {r: r, c: c, inside: inside};
    } else {
      return null;
    }
  }

  this.for_each_cell = function (func) {
    for (var r = 0; r < this.height; r++) {
      for (var c = 0; c < this.width; c++) {
        func(r, c, this.get_cell(r, c), this);
      }
    }
  }

  this.for_each_neighbor = function (r, c, func) {
    var adj = this.adjacent(r, c);
    for (var i = 0; i < adj.length; i++) {
      var neighb = adj[i];
      func(neighb.ix.r, neighb.ix.c, neighb.cell, this);
    }
  }

  this.for_each_name = function (names, func) {
    this.for_each_cell(function (r, c, cell, board) {
        if (names.indexOf(cell.name) != -1) {
          func(r, c, cell, board);
        }
      });
  }

  this.game_state = function (everything_mode) {
    var rules = [];
    var clear_cells = [];
    var zero_cells = [];
    var relevant_mines = [];
    var num_known_mines = 0;

    var mk_rule = function(num_mines, cells) {
      var rule = {num_mines: num_mines, cells: []};
      for (var i = 0; i < cells.length; i++) {
        rule.cells.push(cells[i].name);
      }
      return rule;
    }

    var add = function(set, elem) {
      if (set.indexOf(elem) == -1) {
        set.push(elem);
      }
    }

    this.for_each_cell(function (r, c, cell, board) {
        if (cell.state == 'mine' && cell.flagged) {
          num_known_mines += 1;
          if (everything_mode) {
            add(relevant_mines, cell);
          }
        } else if (cell.visible) {
          add(clear_cells, cell);
          if (cell.state > 0) {
            var cells_of_interest = [];
            var on_frontier = false;
            board.for_each_neighbor(r, c, function (r, c, neighbor, board) {
                if (!neighbor.visible || neighbor.state == 'mine') {
                  cells_of_interest.push(neighbor);
                  if (neighbor.state == 'mine' && neighbor.flagged) {
                    add(relevant_mines, neighbor);
                  } else if (!neighbor.visible) {
                    on_frontier = true;
                  }
                }
              });

            if (everything_mode || on_frontier) {
              rules.push(mk_rule(cell.state, cells_of_interest));
            }
          } else {
            board.for_each_neighbor(r, c, function (r, c, neighbor, board) {
                add(zero_cells, neighbor);
              });
          }
        }
      });

    for (var i = 0; i < relevant_mines.length; i++) {
      rules.push(mk_rule(1, [relevant_mines[i]]));
    }
    if (everything_mode) {
      rules.push(mk_rule(0, clear_cells));
      rules.push(mk_rule(0, zero_cells));
    }

    var num_irrelevant_mines = num_known_mines - relevant_mines.length;
    var state = {rules: rules, total_cells: this.num_cells() - (everything_mode ? 0 : clear_cells.length + num_irrelevant_mines)};
    if (this.num_mines != null) {
      state.total_mines = this.num_mines - (everything_mode ? 0 : num_irrelevant_mines);
    } else {
      state.mine_prob = this.mine_prob;
    }
    return state;
  }
}

function Cell (name, state, visible, flagged) {
  this.name = name;
  this.state = state;
  this.visible = visible;
  this.flagged = flagged;

  this.render = function (g, ctx, params) {
    ctx.fillStyle = (this.visible ? VISIBLE_BG : HIDDEN_BG);
    ctx.fillRect(g.corner[0], g.corner[1], g.span, g.span);

    if (this.state == 'mine') {
      ctx.fillStyle = (this.visible ? EXPLODED : MINE_FILL);
      ctx.beginPath();
      ctx.arc(g.center[0], g.center[1], .5 * g.span * MINE_RADIUS, 0, 2*Math.PI, false);
      if (this.flagged) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
    } else if (this.state > 0 && this.visible) {
      var font_size = g.span * FONT_SIZE;
      ctx.fillStyle = COUNT_FILL[Math.min(this.state - 1, COUNT_FILL.length - 1)];
      ctx.font = font_size + 'pt sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('' + this.state, g.center[0], g.center[1] + font_size * FONT_OFFSET);
    }
  }

  this.render_overlay = function (g, fill, ctx) {
    ctx.fillStyle = fill;
    ctx.fillRect(g.corner[0], g.corner[1], g.span, g.span);
  }
}

HIDDEN_BG = 'rgb(200, 200, 200)';
VISIBLE_BG = 'rgb(230, 230, 230)';
MINE_FILL = 'rgba(0, 0, 0, .5)';
EXPLODED = 'rgba(255, 0, 0, .8)';
COUNT_FILL = ['blue', 'green', 'red', 'purple', 'brown', 'cyan', 'orange', 'black'];
MARGIN = 1;
MINE_RADIUS = .5;
FONT_SIZE = .5;
FONT_OFFSET = .1;

EPSILON = 1.0e-6;

function prob_shade (p) {
  if (p < EPSILON) {
    return 'rgba(0, 0, 255, .2)';
  } else if (p > 1 - EPSILON) {
    return 'rgba(255, 0, 0, .2)';
  } else {
    var MIN_ALPHA = .05;
    var MAX_ALPHA = .8;
    var alpha = MIN_ALPHA * (1 - p) + MAX_ALPHA * p;
    return 'rgba(0, 255, 0, ' + alpha + ')';
  }
}

function pad(i, n) {
  var s = '' + i;
  while (s.length < n) {
    s = '0' + s;
  }
  return s;
}

function mousePos(evt, elem) {
  return {x: evt.pageX - elem.offsetLeft, y: evt.pageY - elem.offsetTop};
}







function render_overlays (board, cell_probs, canvas) {
  var names = [];
  for (var name in cell_probs) {
    names.push(name);
  }
  board.for_each_name(names, function (r, c, cell, board) {
      board.render_overlay(r, c, prob_shade(cell_probs[cell.name]), canvas);
    });

  var other_prob = cell_probs['_other'];
  if (other_prob != null) {
    board.for_each_cell(function (r, c, cell, board) {
        if (!cell.visible && names.indexOf(cell.name) == -1) {
          board.render_overlay(r, c, prob_shade(other_prob), canvas);
        }
      });
  }
}

$(document).ready(function(){
    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");

    var canvas = $('#gameboard')[0];

    x = new Board(30, 16);
    x.populate_n(66);
    x.uncover(3, 3);
    x.flag(3, 10);
    x.render(canvas);

    console.log(x.game_state());

    $.post('http://127.0.0.1:4444/', JSON.stringify(x.game_state()), function (data) {
        if (data['_other'] == null && x.mine_prob != null) {
          data['_other'] = x.mine_prob;
        }

        render_overlays(x, data, canvas);
      }, "json");

    /*
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 3; j++) {
        x.render_overlay(4+j, 6+i, prob_shade(0.), canvas);
      }
    }
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 3; j++) {
        x.render_overlay(4+j, 13+i, prob_shade(1.), canvas);
      }
    }
    var k = .0001;
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 3; j++) {
        x.render_overlay(9+2*j, 6+2*i, prob_shade(k), canvas);
        k += .9998 / 11;
      }
    }
    */
    
    $("#tooltip").hide();
    $("#gameboard").mousemove(function(e){
        var pos = mousePos(e, canvas);
        var p = x.cell_from_xy(pos, canvas);
        if (p) {
          $("#tooltip").show();
          $("#tooltip").css({
              top: (e.pageY + 50) + "px",
              left: (e.pageX + 15) + "px"
            });
          $('#tooltip').text(p.r + ' ' + p.c);
        } else {
          $('#tooltip').hide();
        }
      });
    $("#gameboard").mouseout(function(e){
        $("#tooltip").hide();
      });
  });
