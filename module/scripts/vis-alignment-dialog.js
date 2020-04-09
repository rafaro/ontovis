
var SchemaAlignment = {};

SchemaAlignment._cleanName = function(s) {
  return s.replace(/\W/g, " ").replace(/\s+/g, " ").toLowerCase();
};

var VisAlignmentDialog = {};

/**
 * Installs the tabs in the UI the first time the Wikidata 
 * extension is called.
 */
VisAlignmentDialog.setUpTabs = function() {
  var self = this;
  this._rightPanel = $('#right-panel');
  this._viewPanel = $('#view-panel').addClass('main-view-panel-tab');
  this._toolPanel = $('#tool-panel');
  this._summaryBar = $('#summary-bar')
        .addClass('main-view-panel-tab-header')
        .addClass('active')
        .attr('href', '#view-panel');

  this._schemaPanel = $('<div id="wikidata-schema-panel"></div>')
        .addClass('main-view-panel-tab')
        .appendTo(this._rightPanel);

  var schemaButton = $('<div></div>')
        .addClass('main-view-panel-tab-header')
        .attr('href', '#wikidata-schema-panel')
        .text("Visualization")
        .appendTo(this._toolPanel);

  this._unsavedIndicator = $('<span></span>')
        .html('&nbsp;*')
        .attr('title', $.i18n('wikidata-schema/unsaved-changes-alt'))
        .hide()
        .appendTo(schemaButton);
 
  $('.main-view-panel-tab-header').click(function(e) {
     var targetTab = $(this).attr('href');
     VisAlignmentDialog.switchTab(targetTab);
     e.preventDefault();
  });

  /**
   * Init the schema tab
   */
  var schemaTab = $(DOM.loadHTML("ontovis", "scripts/vis-alignment-tab.html")).appendTo(this._schemaPanel);
  var schemaElmts = this._schemaElmts = DOM.bind(schemaTab);
  schemaElmts.addItemButton.click(function(e) {
    self._addItem();
    VisAlignmentDialog._hasChanged();
    e.preventDefault();
  });
  schemaElmts.visButton
        .text('Load')
        .attr('title', 'Load visualization')
        .prop('disabled', false)
        .click(function() { VisAlignmentDialog._loadtriples3(); });

  this._wikibasePrefix = "http://www.wikidata.org/entity/"; // hardcoded for now

  // Load the existing schema
  this._reset(theProject.overlayModels.wikibaseSchema);
  // Perform initial preview
  //this.preview();
}

VisAlignmentDialog.switchTab = function(targetTab) {
  $('.main-view-panel-tab').hide();
  $('.main-view-panel-tab-header').removeClass('active');
  $('.main-view-panel-tab-header[href="'+targetTab+'"]').addClass('active');
  $(targetTab).show();
  resizeAll();
  var panelHeight = this._viewPanel.height();
  this._schemaPanel.height(panelHeight);
  //this._issuesPanel.height(panelHeight);
  //this._previewPanel.height(panelHeight);
  // Resize the inside of the schema panel
  var headerHeight = this._schemaElmts.schemaHeader.outerHeight();
  this._schemaElmts.canvas.height(panelHeight - headerHeight - 10);

  if (targetTab === "#view-panel") {
     ui.dataTableView.render();
  }
}

VisAlignmentDialog.isSetUp = function() {
  return $('#wikidata-schema-panel').length !== 0;
}

VisAlignmentDialog.launch = function(onDone) {
  this._onDone = onDone;
  this._hasUnsavedChanges = false;

  if (!VisAlignmentDialog.isSetUp()) {
     VisAlignmentDialog.setUpTabs();
  }
  VisAlignmentDialog.switchTab('#wikidata-schema-panel');

  // this._createDialog();
}


var beforeUnload = function(e) {
  if (VisAlignmentDialog.isSetUp() && VisAlignmentDialog._hasUnsavedChanges === true) {
     return (e = $.i18n('wikidata-schema/unsaved-warning'));
  }
};

$(window).bind('beforeunload', beforeUnload);

VisAlignmentDialog._reset = function(schema) {
  this._originalSchema = schema || { itemDocuments: [] };
  this._schema = cloneDeep(this._originalSchema); // this is what can be munched on
  this._copiedReference = null;

  $('#schema-alignment-statements-container').empty();

  if (this._schema && this._schema.itemDocuments) {
    for(var i = 0; i != this._schema.itemDocuments.length; i++) {
      this._addItem(this._schema.itemDocuments[i]);
    }
  }
};
var _datasetToTable = function() {
  return function(dataset) {
    // simple sort, good enough for this purpose
    // FIXME: is this needed?
    dataset.sort(function(a, b) {
      if(a.graph.value !== b.graph.value) {
        return a.graph.value > b.graph.value;
      }
      if(a.subject.value !== b.subject.value) {
        return a.subject.value > b.subject.value;
      }
      if(a.predicate.value !== b.predicate.value) {
        return a.predicate.value > b.predicate.value;
      }
      return a.object.value > b.object.value;
    });
    dataset.forEach(function(quad) {
      console.log(quad);
      //tbody.append(_tableRow(quad));
    });
  };
};
VisAlignmentDialog._loadtriples3 = function(onDone) {

  var ttl;
  
  $.ajax({
      url: "command/core/export-rows/" + name + ".ttl",
      data: { 
          project:theProject.id,                
          engine:JSON.stringify(ui.browsingEngine.getJSON()),
          format:"Turtle"
      } ,
      async: false,   // this is the important line that makes the request sincronous
      type: 'post',
      dataType: 'text', 
      success: function(output) {
          ttl = output;
      }
  });
  //var quads;
  var parser = new N3.Parser();
  
  var tplnodes = new Array();
  var tpllink = new Array();
  triples2 = parser.parse(ttl);
  console.log(`Triples: ${triples2}`);
  for (i = 0, len = triples2.length; i < len; ++i) {

    if(tplnodes.indexOf(triples2[i].subject.id) === -1) {
      tplnodes.push(triples2[i].subject.id);
    }

    if(tplnodes.indexOf(triples2[i].object.id) === -1) {
      tplnodes.push(triples2[i].object.id);
    }
    tpllink.push([triples2[i].subject.id,triples2[i].object.id,{color:'#000000', label:triples2[i].predicate.id}])
    //tpl.push({subject:triples2[i].subject.id, 	predicate:triples2[i].predicate.id, object:triples2[i].object.id})
    console.log(`t${i}: ${triples2[i].object.id}`);
  }
  var tpl = {
    "nodes":tplnodes, 
    "edges":tpllink
  }
  var tplnodes2 = new Array();
  var tpllink2  = new Array();
  tplnodes2.push("Deputy");
  tplnodes2.push("Patrol");
  tplnodes2.push("Deput_Sheriff");
  tplnodes2.push("Patrol_Officer");
  tpllink2.push([
    "Deputy", 
    "Deput_Sheriff",
    {color:'#000000', label: "a"}
  ]);
  tpllink2.push([
    "Patrol", 
    "Patrol_Officer",
    {color:'#000000', label:"a"}
  ]);
  var tpl2 = {
    "nodes":tplnodes2, 
    "edges":tpllink2
  }

  var graphJSON = {
    "nodes": [
      "Amphitryon",
      "Alcmene",
      "Iphicles",
      "Heracles"
    ],
    "edges": [
      ["Amphitryon", "Alcmene",  {color: '#00A0B0', label:'teste'}],
      ["Alcmene", "Amphitryon"],
      ["Amphitryon", "Iphicles"],
      ["Amphitryon", "Heracles"]
    ]
  };
  console.log(`tpl:${tpl2} \ngraph:${graphJSON}`);
  jQuery(function(){
    var graph = new Springy.Graph();
    graph.loadJSON(tpl);
  
    var springy = jQuery('#springydemo2').springy({
      graph: graph
    });
  });
}

VisAlignmentDialog._loadtriples2 = function(onDone) {
  var triples = [
    {subject:"ex:ThaiLand", 	predicate:"ex:hasFood", 	object:"ex:TomYumKung"},
    {subject:"ex:TomYumKung", 	predicate:"ex:isFoodOf", 	object:"ex:ThaiLand"},
    {subject:"ex:TomYumKung", 	predicate:"rdf:type", 		object:"ex:SpicyFood"},
    {subject:"ex:TomYumKung", 	predicate:"ex:includes", 	object:"ex:shrimp"},
    {subject:"ex:TomYumKung", 	predicate:"ex:includes", 	object:"ex:chilly"},
    {subject:"ex:TomYumKung", 	predicate:"ex:requires", 	object:"ex:chilly"},
    {subject:"ex:TomYumKung", 	predicate:"ex:hasSpicy", 	object:"ex:chilly"},
    {subject:"ex:TomYumKung", 	predicate:"ex:includes", 	object:"ex:lemon"},
    {subject:"ex:lemon", 		predicate:"ex:hasTaste", 	object:"ex:sour"},
    {subject:"ex:chilly", 		predicate:"ex:hasTaste", 	object:"ex:spicy"}
  ];

  var svg = d3.select("#metadata-body").append("svg")
        .attr("width", 800)
        .attr("height", 600)
        ;
    
  var force = d3.layout.force().size([800, 600]);

  var graph = triplesToGraph(triples,svg);
  update(svg, force,graph);
};

VisAlignmentDialog._loadtriples = function(onDone) {
  let canvas = this.base.querySelector('"#metadata-body"');
    let ctx = canvas.getContext('2d');
    let PIXEL_RATIO = window.devicePixelRatio;    canvas.width = canvas.offsetWidth * PIXEL_RATIO;
    canvas.height = canvas.offsetHeight * PIXEL_RATIO;
    ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
    
    this.props.onDraw(ctx, canvas.offsetWidth, canvas.offsetHeight);
};

VisAlignmentDialog._save = function(onDone) {
  var self = this;
  var schema = this.getJSON();

  if (schema === null) {
    alert($.i18n('wikidata-schema/incomplete-schema-could-not-be-saved'));
  }

  Refine.postProcess(
    "wikidata",
    "save-wikibase-schema",
    {},
    { schema: JSON.stringify(schema) },
    {},
    {   
      onDone: function() {
        theProject.overlayModels.wikibaseSchema = schema;

        $('.invalid-schema-warning').hide();
        self._changesCleared();

        if (onDone) onDone();
      },
      onError: function(e) {
        alert($.i18n('wikidata-schema/incomplete-schema-could-not-be-saved'));
      },
    }
  );
};

VisAlignmentDialog._discardChanges = function() {
  this._reset(theProject.overlayModels.wikibaseSchema);
  this._changesCleared();
}

VisAlignmentDialog._changesCleared = function() {
  this._hasUnsavedChanges = false;
  this._unsavedIndicator.hide();
}

