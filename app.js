
// Spectral Point v0.5
// A UI for to BCET Landsat data and to collect
// spectral signatures for multiple point locations
// Copyright (C) 2017 Sam Brooke
// Email: sbrooke@tuta.io

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var app = {};

app.project_variables = {
  title: 'Untitled',
  output_directory: '',
  IMAGE: '',
  region_bounds: []
};

app.setProjectTitle = function() {
  var title = app.project_name_input.getValue();
  title = title.replace(/ /g, "_").replace(/[|&;$%@"<>()+,]/g, "");
  app.project_variables.title = title;
  app.project_name_input.setValue(title, false);
};

app.clearLayerAssets = function(names) {

  var clearMap = function(e,i){
    if(names.indexOf(e.get('name')) > -1){
      Map.remove(e);
    }
  };
  // Run twice because some units are weirdly missing
  for(var i = 0; i < 2; i++){
    Map.layers().forEach(clearMap);
  }
};

app.mapObjects = [];

app.selectRegion = function() {
    Map.style().set('cursor', 'crosshair');
    app.mapAssets = [];
    app.clearLayerAssets(['regionRectangle','regionBottomRight','regionTopLeft']); 

    var createBtns = true;
    
    if(app.roi){
      createBtns = false;
    }
    
    var listenerId = Map.onClick(function(coords) {
      
      var point = ee.Geometry.Point(coords.lon, coords.lat);
      
      // Once the panel is hidden, the map should not
      // try to close it by listening for clicks.
      app.mapAssets.push(point);
      
      if(app.mapAssets.length > 1){
        
        var topLeft = app.mapAssets[0];
        var bottomRight = app.mapAssets[1];
        
        Map.addLayer(point, {color: 'FF0000'}, 'regionBottomRight');
        
        var yMax = ee.Number(topLeft.coordinates().get(1));
        var yMin = ee.Number(bottomRight.coordinates().get(1));
        var xMax = ee.Number(topLeft.coordinates().get(0));
        var xMin = ee.Number(bottomRight.coordinates().get(0));
        
        
        var region_bounds = [xMax, yMin, xMin, yMax];
        
        app.project_variables.region_bounds = region_bounds;
        app.roi = ee.Geometry.Rectangle(region_bounds);
        var roi_coords = app.roi.coordinates().get(0);
        app.roi_outline = ee.Geometry.LineString(roi_coords);
        
        Map.addLayer(app.roi, {color: 'FF0000'}, 'regionRectangle');
        Map.unlisten(listenerId);
        
        app.top_left_lat.setValue(yMax.getInfo(), false);
        app.bottom_right_lat.setValue(yMin.getInfo(), false);
        app.top_left_lon.setValue(xMax.getInfo(), false);
        app.bottom_right_lon.setValue(xMin.getInfo(), false);
        
        if(createBtns){
          app.continueToBCETBtn();
        }
        
      } else {
        Map.addLayer(point, {color: 'FF0000'}, 'regionTopLeft');
      }
    });
};

app.continueToBCETBtn = function(){
  
  var btbclabel = ui.Label({
    value: 'Next',
    style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
  });
  
  var btbcbtn = ui.Button({
    label: 'Continue to contrast enhancement', 
    onClick: function(){
      app.BCET_Region_init();
    }, 
    style: {
      stretch:'horizontal'
    }
  });
  
  app.regionSelect.panel.add(btbclabel);
  app.regionSelect.panel.add(btbcbtn);
};

app.setRegion = function() {
  app.clearLayerAssets(['regionRectangle','regionBottomRight','regionTopLeft']);
  
  var createBtns = true;
  
  if(app.roi){
    createBtns = false;
  }
  
  if(app.top_left_lat.getValue()){

    var yMax = ee.Number.parse(app.top_left_lat.getValue());
    var yMin = ee.Number.parse(app.bottom_right_lat.getValue());
    var xMin = ee.Number.parse(app.top_left_lon.getValue());
    var xMax = ee.Number.parse(app.bottom_right_lon.getValue());
    
    if(yMax && yMin && xMax && xMin){
      var region_bounds = ee.List([xMin, yMin, xMax, yMax]);
      
      app.project_variables.region_bounds = region_bounds;  
      app.roi = ee.Geometry.Rectangle(region_bounds);
      var roi_coords = app.roi.coordinates().get(0);
      app.roi_outline = ee.Geometry.LineString(roi_coords);   
      
      Map.addLayer(app.roi, {color: 'FF0000'}, 'regionRectangle');
      
      var tl = ee.Geometry.Point(ee.List([xMin, yMax]));
      var br = ee.Geometry.Point(ee.List([xMax, yMin]));
      
      Map.addLayer(tl, {color: 'FF0000'}, 'regionTopLeft');
      Map.addLayer(br, {color: 'FF0000'}, 'regionBottomRight');
      
      app.centerRegion();
      
      if(createBtns){
        app.continueToBCETBtn();
      }
    }
  }
};

app.centerRegion = function(){
  if (app.roi){
    Map.centerObject(app.roi);
  }
};

app.setImage = function() {
  var imageIdTrailer = app.picker.select.getValue();
  app.project_variables.IMAGE = app.COLLECTION_ID + '/' + imageIdTrailer;
  app.filters.panel.style().set('shown', false);
  app.picker.panel.style().set('shown', false);
  app.vis.panel.style().set('shown', false);
  app.regionSelect.panel.style().set('shown', true);
};

app.BCET_Region_init = function(){
  app.BCET.panel.style().set('shown', true);
  app.regionSelect.panel.style().set('shown', false);  
};

app.createInputs = function(){
  app.project_name_input = ui.Textbox({
    placeholder: 'Project Name',
    onChange: app.setProjectTitle,
    style: {
      stretch: 'horizontal'
    }
  });
  
  app.top_left_lat = ui.Textbox({
    placeholder: 'Lat',
    style: {
      width: '50px'
    }
  });
  
  app.top_left_lon = ui.Textbox({
    placeholder: 'Lon',
    style: {
      width: '50px'
    }
  });
  app.bottom_right_lat = ui.Textbox({
    placeholder: 'Lat',
    style: {
      width: '50px'
    }
  });
  app.bottom_right_lon = ui.Textbox({
    placeholder: 'Lon',
    style: {
      width: '50px'
    }
  });
  app.position_panel = ui.Panel([
    ui.Label({
      value: 'Top Left:',
      style: {fontWeight: 'bold', fontSize: '10px'}
    }),
    app.top_left_lat,
    app.top_left_lon,
    ui.Label({
      value: 'Bot Right:',
      style: {fontWeight: 'bold', fontSize: '10px'}
    }),
    app.bottom_right_lat,
    app.bottom_right_lon
  ], ui.Panel.Layout.flow('horizontal'));

  app.position_inputs = {
    panel: app.position_panel
  };
};

app.todaysDate = function(){
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!

  var yyyy = today.getFullYear();
  
  if(dd<10){
    dd='0'+dd;
  } 
  
  if(mm<10){
    mm='0'+mm;
  }
  
  app.today = [yyyy,mm,dd].join('-');
};
app.todaysDate();

// Point Data Functions

var guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4();
};

// Dictionary for storing coordinate data
app.coordData = {};
app.pointerIds = [];
app.pointListenId = false;
app.hex_counter = 0;
app.colorList = {};
app.bandChart = false;
app.pointListening = false;

app.pointMapListen = function(){
  if(!app.pointListening){
    app.pointListening = true;
    
    if(!app.pointerIds){
     var r = confirm("Do you want to clear the map?");
    
      if (r == 1) {
        app.clearLayerAssets(app.pointerIds);
        app.pointerIds = [];
        app.coordData = {};
      }
    }
    
    Map.style().set('cursor', 'crosshair');
  
    app.pointListenId = Map.onClick(function(coords) {
      app.createPoint(ee.Dictionary(coords), false);
    });
  }
};

app.pointMapUnlisten = function(){
  if(app.pointListening){
    app.pointListening = false;
    if(app.pointListenId){
      Map.unlisten(app.pointListenId);
      app.pointListenId = false;
      Map.style().set('cursor', 'hand');
    }
  }
};

app.removePointMarker = function(marker_id){
  app.clearLayerAssets([marker_id]);
  var index = app.pointerIds.indexOf(marker_id);
  if (index > -1) {
    app.pointerIds.splice(index, 1);
  }
  delete app.coordData[marker_id];
  delete app.colorList[marker_id];
  app.setBandChart(app.pointerIds);
};

app.centreMarker = function(marker_id){
  var coords = app.coordData[marker_id];
  Map.setCenter(coords.get('lon'), coords.get('lat'));
};

app.updateVisibleBands = function(){
  app.CHART_BANDS = [];
  for (var i = 0; i < app.BCET_BANDS.length; i++) {
    var input_name = app.BCET_BANDS[i]+'_visible';
    if (app[input_name].getValue()){
      app.CHART_BANDS.push(app.BCET_BANDS[i]);
    }
  }
  for (var i = 0; i < app.PCA_BANDS.length; i++) {
    var input_name = app.PCA_BANDS[i]+'_visible';
    if (app[input_name].getValue()){
      app.CHART_BANDS.push(app.PCA_BANDS[i]);
    }
  }
  app.setBandChart(app.pointerIds);
};

app.visibleBandSelect = function(){
  
  for (var i = 0; i < app.BCET_BANDS.length; i++) {
    var input_name = app.BCET_BANDS[i]+'_visible';
    app[input_name] = ui.Checkbox({
      label: app.BCET_BANDS[i],
      value: true,
      onChange: app.updateVisibleBands
    });
    app.chartBandSelect.panel.add(app[input_name]);
  }
  
  for (var i = 0; i < app.PCA_BANDS.length; i++){
    var input_name = app.PCA_BANDS[i]+'_visible';
    app[input_name] = ui.Checkbox({
      label: app.PCA_BANDS[i],
      value: true,
      onChange: app.updateVisibleBands
    });
    app.chartBandSelect.panel.add(app[input_name]);  
  }
  
  app.setBandChart(app.pointerIds);
  app.showHideChartBandBtn = ui.Button({
    label: 'Hide', 
    onClick: function(){
      for (var i = 0; i < app.BCET_BANDS.length; i++) {
        var input_name = app.BCET_BANDS[i]+'_visible';
        if (app[input_name].style().get('shown')){
          if(i === 0){
            app.showHideChartBandBtn.set('label', 'Show');
          }
          app[input_name].style().set('shown', false);
        } else {
          if(i === 0){
            app.showHideChartBandBtn.set('label', 'Hide');
          }
          app[input_name].style().set('shown', true);
        }
      }    
      for (var i = 0; i < app.PCA_BANDS.length; i++) {
        var input_name = app.PCA_BANDS[i]+'_visible';
        if (app[input_name].style().get('shown')){
          if(i === 0){
            app.showHideChartBandBtn.set('label', 'Show');
          }
          app[input_name].style().set('shown', false);
        } else {
          if(i === 0){
            app.showHideChartBandBtn.set('label', 'Hide');
          }
          app[input_name].style().set('shown', true);
        }
      }
    },
    style: {
      stretch:'horizontal',
      fontSize: '18px'
    }
  });
  app.chartBandSelect.panel.add(app.showHideChartBandBtn);
};

app.setBandChart = function(marker_ids){
  if(app.CHART_BANDS && (marker_ids.length > 0)){
    var points = [];
    var plot_series = {};
    
    for (var i = 0; i < marker_ids.length; i++) {
      var coords = app.coordData[marker_ids[i]];
      var point = ee.Feature(ee.Geometry.Point(ee.List([coords.get('lon'), coords.get('lat')])), {label: marker_ids[i]});
      points.push(point);
      plot_series[i] = {color: app.colorList[marker_ids[i]]};
    }
    
    var bandPoints = ee.FeatureCollection(points);
    
    if (app.bandChart){
      app.coordMasterPanel.remove(app.bandChart);
    }
    
    var imageBands = app.CURRENT_IMAGE.select(app.CHART_BANDS);

    app.bandChart = ui.Chart.image.regions({
      image: imageBands,
      regions: bandPoints,
      seriesProperty: 'label',
      scale: 30
    });
    
    app.bandChart.setChartType('LineChart');
    
    if(app.BCETskipped){
      var chartTitle = 'Pixel Values';
      var chartY = 'R';
    } else {
      var chartTitle = 'Pixel Values';
      var chartY = 'R*';
    }
    
    app.bandChart.setOptions({
      title: chartTitle,
      hAxis: {
        title: 'Band'
      },
      vAxis: {
        title: chartY
      },
      lineWidth: 1,
      pointSize: 4,
      series: plot_series
    });
    
    app.coordMasterPanel.add(app.bandChart);
  }
};


app.coordPanel = function(lat, lon, marker_id){
  var cp = ui.Panel([
    ui.Label({
      value: 'Id: '+marker_id.toString(),
      style: {padding: '0 10px 0 0', fontSize: '12px', backgroundColor: app.colorList[marker_id]}
    }),
    ui.Label({
      value: 'Lat: '+lat.getInfo().toFixed(8).toString(),
      style: {padding: '0 10px 0 0', fontSize: '12px'}
    }),
    ui.Label({
      value: 'Lon: '+lon.getInfo().toFixed(8).toString(),
      style: {padding: '0 10px 0 0', fontSize: '12px'}
    })
  ], ui.Panel.Layout.flow('horizontal'));
  var center_btn = ui.Button({
    label: 'Centre Map',
    onClick: function(){
      app.centreMarker(marker_id);
    },
    style: {
      fontSize: '16px'
    }
  });
  var rmv_btn = ui.Button({
    label: 'Remove', 
    onClick: function(){
      app.removePointMarker(marker_id);
      app.coordMasterPanel.remove(cp);
    },
    style: {
      fontSize: '16px'
    }
  });
  cp.add(center_btn);
  cp.add(rmv_btn);
  
  return cp;
};

app.createPoint = function(coords, sample_name_original){
    
    var gid = guid();
    var coord_id = '';
    
    if(sample_name_original){

      var sample_name = ee.String(sample_name_original).replace(ee.String('/ /g'), ee.String("_")).replace(ee.String('/[|&;$%@"<>()+,]/g'), ee.String('')).getInfo();
      
      if (app.pointerIds.indexOf(sample_name) < 0){
        coord_id = sample_name;
      } else {
        coord_id = [coord_id, gid].join('_');
      }
    } else {
      coord_id = gid;
    }
    
    var point = ee.Geometry.Point(ee.List([coords.get('lon'), coords.get('lat')]));
    app.pointerIds.push(coord_id);
    app.coordData[coord_id] = coords;
    app.colorList[coord_id] = app.HEX_CODES[app.hex_counter];
    app.coordMasterPanel.add(app.coordPanel(coords.get('lat'), coords.get('lon'), coord_id));
    
    Map.addLayer(point, {color: app.HEX_CODES[app.hex_counter]}, coord_id);
    
    if (app.hex_counter < (app.HEX_CODES.length)-1) {
      app.hex_counter++;
    } else {
      app.hex_counter = 0;
    }
    
    app.setBandChart(app.pointerIds);
};

app.addManualCoord = function(){
  var gid = guid();
  var coords = ee.Dictionary({
    lon: ee.Number.parse(app.lon_input.getValue()),
    lat: ee.Number.parse(app.lat_input.getValue())
  });
  var sample_name = app.sample_input.getValue();
  app.createPoint(coords, sample_name);
};

app.exportCoords = function(){
  var points = [];
  if (app.pointerIds){
    for (var i = 0; i < app.pointerIds.length; i++) {
      var coords = app.coordData[app.pointerIds[i]];
      var point = ee.Feature(ee.Geometry.Point(ee.List([coords.get('lon'), coords.get('lat')])), {label: app.pointerIds[i]});
      points.push(point);
    }
    var bandPoints = ee.FeatureCollection(points);
    var fid = guid();
    var fileName = [fid,app.project_variables.title].join('_');
    Export.table.toDrive({
      collection: bandPoints,
      description: [fid,'Coordinates',app.project_variables.title].join('_'),
      fileNamePrefix: fileName, 
      fileFormat: 'KMZ'
    });
  }
};

app.exportFusionTable = function(){
  var fusion_id = app.fusion_table_id.getValue();
  var points = [];
  
  if(fusion_id){
    var fid_protocol = ee.String('ft:').cat(fusion_id).getInfo();
    var fusion_data = ee.FeatureCollection(fid_protocol);
    
    var names = ee.List(fusion_data.aggregate_array('name'));
    var surfaces = ee.List(fusion_data.aggregate_array('surface'));

    var cc = fusion_data.geometry().coordinates();
    
    var getLatLon = function(n){
      var latlon = ee.List(cc.get(n));
      var name = names.get(n);
      var sface = surfaces.get(n);
      return ee.Feature(ee.Geometry.Point(latlon), {label: name, surface:sface});
    };
    
    var seq = ee.List.sequence(0, cc.length().subtract(1));

    var points = seq.map(getLatLon);

    var bandPoints = ee.FeatureCollection(points);
    
    var ft = ee.FeatureCollection(ee.List([]));

    var fill = function(img, ini) {
      // type cast
      var inift = ee.FeatureCollection(ini);
      // gets the values for the points in the current img
      var ft2 = img.reduceRegions({
        collection:bandPoints,
        reducer:ee.Reducer.first(),
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0]
      });
      return inift.merge(ft2);
    };
  
    var fid = guid();
    var fileName = [fid,app.project_variables.title].join('_');
  
    var res = fill(app.CURRENT_IMAGE.select(app.CHART_BANDS), ft);
    
    var desc = [fid,'Reflectance',app.project_variables.title].join('_');
    print('Exporting point values to task');
    
    Export.table.toDrive({
      collection:res,
      description: desc,
      fileNamePrefix: fileName, 
      fileFormat: 'CSV'
    });
  }
};

app.BCETRegion = function(skip){
  app.regionSelect.panel.style().set('shown', false);
  app.BCETBandSelect.panel.style().set('shown', true);
  app.BCETskipped = skip;
  
  var collection_params = app.COLLECTION_ID.split('/');
  
  if(collection_params[0] == 'LANDSAT'){
    var bandNames = ee.List(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11']);
    var allBands = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11'];
  } else {
    // SENTINEL BANDS
    var bandNames = ee.List(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7',
    'B8', 'B8A', 'B9', 'B10', 'B11', 'B12']);
  }
  
  var box = app.roi;
  
  if(skip){
    app.BCET_BANDS = allBands;
    app.BCETvisParams = {
      bands: ['B5', 'B4', 'B3'],
    };
  } else {
    
    if(box){
      var reducers = ee.Reducer.mean().combine({
        reducer2: ee.Reducer.minMax(),
        sharedInputs: true
      });
      
      var stats = app.CURRENT_IMAGE.reduceRegion({
        reducer: reducers,
        geometry: box,
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
      
      var pow2 = app.CURRENT_IMAGE.pow(2);
      
      var s_values = pow2.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: box,
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
      
    } else {
      var reducers = ee.Reducer.mean().combine({
        reducer2: ee.Reducer.minMax(),
        sharedInputs: true
      });
      
      var stats = app.CURRENT_IMAGE.reduceRegion({
        reducer: reducers,
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
      
      var pow2 = app.CURRENT_IMAGE.pow(2);
      
      var s_values = pow2.reduceRegion({
        reducer: ee.Reducer.mean(),
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });   
    }
      
    
    // BCET values
    var L =  ee.Number(0); // minimum
    var H =  ee.Number(255); // maximum
    var E =  ee.Number(110); // mean
    
    var len = ee.Number(bandNames.length());
  
    var seq = ee.List.sequence(ee.Number(0), len.subtract(1));
    
    var processBCETBands = function(i){  
      var band_name = ee.String(bandNames.get(i));
      
      var band = app.CURRENT_IMAGE.select(band_name);
      
      var l = ee.Number(stats.get(band_name.cat('_min')));
      var h = ee.Number(stats.get(band_name.cat('_max')));
      var e = ee.Number(stats.get(band_name.cat('_mean')));
      var s = ee.Number(s_values.get(band_name));
      
      
      var b_nom = h.pow(2).multiply(E.subtract(L)).subtract(s.multiply(H.subtract(L))).add(l.pow(2).multiply(H.subtract(E)));
      var b_den = ee.Number(2).multiply(h.multiply(E.subtract(L)).subtract(e.multiply(H.subtract(L))).add(l.multiply(H.subtract(E))));
      var b = b_nom.divide(b_den);
      
      var a1 = H.subtract(L);
      var a2 = h.subtract(l);
      var a3 = h.add(l).subtract(ee.Number(2).multiply(b));
      
      var a = a1.divide(a2.multiply(a3));
      
      var c = L.subtract(a.multiply(l.subtract(b).pow(2)));
    
      var y = app.CURRENT_IMAGE.expression(
        'a * (x - b)**2 + c', {
        'a': a,
        'b': b,
        'c': c,
        'x': app.CURRENT_IMAGE.select(band_name)
      });
      
      var y_r = y.select(
          ['constant',], // old names
          [band_name.cat(ee.String('_BCET'))] // new names
      );
      
      return y_r;
    }
    
    var BCETBandNames = function(n){  
      var band_name = ee.String(bandNames.get(n));
      return band_name.cat('_BCET');
    }
    
    var BCET_COLLECTION = ee.ImageCollection(seq.map(processBCETBands));
    app.BCET_BANDS = ee.List(seq.map(BCETBandNames)).getInfo();
    
    var stackCollection = function(collection, names) {
      // Create an initial image.
      var first = ee.Image(collection.first()).select([]);
      // Write a function that appends a band to an image.
      var appendBands = function(image, previous) {
        return ee.Image(previous).addBands(image);
      };
      var appended = ee.Image(collection.iterate(appendBands, first));
      
      return appended.rename(names);
    };
    
    app.BCET_IMAGE = stackCollection(BCET_COLLECTION, app.BCET_BANDS);
    
    app.CURRENT_IMAGE = app.CURRENT_IMAGE.addBands(app.BCET_IMAGE.toFloat());
  

    app.BCETvisParams = {
      bands: ['B5_BCET', 'B4_BCET', 'B3_BCET'],
      min: 0,
      max: 255,
      gamma: [0.95, 1.1, 1]
    };
  
    var mean_check = app.CURRENT_IMAGE.select(app.BCET_BANDS).reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: box,
      crs: 'EPSG:4326',
      crsTransform: [0.00025,0,0,0,-0.00025,0],
      bestEffort:true
    });
    
    // print('BCET mean values...');
    // print(mean_check);
  }
  
  Map.clear();
  
  
  if(skip){
    Map.addLayer(app.CURRENT_IMAGE, app.BCETvisParams, 'All Bands', true);
  } else {
    Map.addLayer(app.CURRENT_IMAGE, app.BCETvisParams, 'All Bands', false);
    Map.addLayer(app.BCET_IMAGE.toFloat(), app.BCETvisParams,  'BCET Bands', true);
  }
  
  if(box){
    Map.addLayer(app.roi_outline, {color: 'FFFFFF'}, 'roi_outline');
  }
  
  app.centerRegion();
  app.BCETBandSelect.panel.clear();
  
  if(skip){
     app.BandSelectInputs();
     app.PCAInputs(false);
  } else {
     app.BCETBandSelectInputs();
     app.PCAInputs(true);
  }
  
  app.BCET.panel.style().set('shown', false);
  app.PCABandSelect.panel.style().set('shown', true);
  app.PCA_Map_Layer.panel.style().set('shown', true);
  app.continueToPoint.panel.style().set('shown', true);
};


app.refreshLayer = function(){
  // DEFAULT = ['B5_BCET', 'B4_BCET', 'B3_BCET']
  var R = app.BCET_R.getValue();
  var G = app.BCET_G.getValue();
  var B = app.BCET_B.getValue();
  
  app.clearLayerAssets('roi_outline');
  
  if(app.BCETskipped){
    app.BCETvisParams = {
      bands: [R, G, B]
    };
    app.clearLayerAssets('All Bands');
    Map.addLayer(app.CURRENT_IMAGE, app.BCETvisParams, 'All Bands');
    
  } else {
    app.BCETvisParams = {
      bands: [R, G, B],
      min: 0,
      max: 255,
      gamma: [0.95, 1.1, 1]
    };
    app.clearLayerAssets('BCET Bands');
    Map.addLayer(app.BCET_IMAGE, app.BCETvisParams, 'BCET Bands');
  }
  
  Map.addLayer(app.roi_outline, {color: 'FFFFFF'}, 'roi_outline');
  
};

app.pointSetup = function(){
  app.BCET.panel.style().set('shown', false);
  app.BCETBandSelect.panel.style().set('shown', false);
  app.PCABandSelect.panel.style().set('shown', false);
  app.PCA_Map_Layer.panel.style().set('shown', false);
  app.continueToPoint.panel.style().set('shown', false);
  app.visibleBandSelect();
  app.chartBandSelect.panel.style().set('shown', true);
  app.pointSelect.panel.style().set('shown', true);
  app.export.panel.style().set('shown', true);  
  app.CHART_BANDS = app.BCET_BANDS.concat(app.PCA_BANDS);
};

app.print_reflectance_data = function(){
  // Empty Collection to fill
  var marker_ids = app.pointerIds;
  var points = [];
  
  for (var i = 0; i < marker_ids.length; i++) {
    var coords = app.coordData[marker_ids[i]];
    var point = ee.Feature(ee.Geometry.Point(ee.List([coords.get('lon'), coords.get('lat')])), {label: marker_ids[i]});
    points.push(point);
  }
  
  var pts = ee.FeatureCollection(points);
  
  var ft = ee.FeatureCollection(ee.List([]));

  var fill = function(img, ini) {
    // type cast
    var inift = ee.FeatureCollection(ini);
    // gets the values for the points in the current img
    var ft2 = img.reduceRegions({
      collection:pts,
      reducer:ee.Reducer.first(),
      crs: 'EPSG:4326',
      crsTransform: [0.00025,0,0,0,-0.00025,0]
    });
    return inift.merge(ft2);
  };
  
  var fid = guid();
  var fileName = [fid,app.project_variables.title].join('_');
  
  var res = fill(app.CURRENT_IMAGE.select(app.CHART_BANDS), ft);
  
  Export.table.toDrive({
      collection:res,
      description: [fid,'Reflectance',app.project_variables.title].join('_'),
      fileNamePrefix: fileName, 
      fileFormat: 'CSV'
  });
};

// Create Interface
app.createPanels = function() {
  app.intro = {
    panel: ui.Panel([
      ui.Label({
        value: 'Spectral Point',
        style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
      }),
      ui.Label('An application to gather spectral signatures for multiple point locations'),
      ui.Label({
        value:'Author: Sam Brooke (sbrooke@tuta.io, sambrooke.uk)',
        style: {fontSize: '12px'}
      }),
      app.project_name_input
    ])
  };

  // LANDSAT/SENTINEL Data chooser -- lifted from Google Script
  app.filters = {
    mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    startDate: ui.Textbox('YYYY-MM-DD', '2014-02-01'),
    endDate: ui.Textbox('YYYY-MM-DD', app.today),
    applyButton: ui.Button('Apply Filter', app.applyFilters),
    cloudButton: ui.Button('Cloud-free Composite', app.cloudComposite),
    loadingLabel: ui.Label({
      value: 'Loading...',
      style: {stretch: 'vertical', color: 'gray', shown: false}
    })
  };
  
  app.collection_picker = ui.Select({
    items: app.LANDSAT_COLLECTIONS,
    value: 'LANDSAT/LC8_L1T_32DAY_TOA', /* Default */
    onChange: app.selectCollection
  });
  
  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('Select Dataset', {fontWeight: 'bold'}),
      ui.Select({
        items: ['Landsat 8', 'Sentinel 2'],
        value:'Landsat 8',
        onChange: app.selectDataset
      }),
      app.collection_picker,
      ui.Label('Pan and zoom map to area'),
      ui.Label('Start date', app.HELPER_TEXT_STYLE), app.filters.startDate,
      ui.Label('End date', app.HELPER_TEXT_STYLE), app.filters.endDate,
      app.filters.mapCenter,
      ui.Panel([
        app.filters.applyButton,
        app.filters.cloudButton,
        app.filters.loadingLabel
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });

  /* The image picker section. */
  app.picker = {
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      placeholder: 'Select an image ID',
      onChange: app.refreshMapLayer
    })
  };

  app.manual_image = ui.Textbox({
    placeholder: 'DATASET/COLLECTION/IMAGE',
    style: {
      width: '400px'
    }
  });
  
  app.manual_image_setup = function(){
    Map.clear();
    var manual_image_id = ee.String(app.manual_image.getValue()).getInfo();
    var mc = manual_image_id.split('/');
    app.COLLECTION_ID = mc[0]+'/'+mc[1];
    app.CURRENT_IMAGE = ee.Image(manual_image_id);
    app.VIS_OPTIONS = app.vis_params();
    var visOption = app.VIS_OPTIONS[app.vis.select.getValue()];
    Map.addLayer(app.CURRENT_IMAGE, visOption.visParams, manual_image_id);
  };
  
  /* The panel for the picker section with corresponding widgets. */
  app.picker.panel = ui.Panel({
    widgets: [
      ui.Label('Choose an image', {fontWeight: 'bold'}),
      ui.Panel([
        app.picker.select
      ], ui.Panel.Layout.flow('horizontal')),
      ui.Panel([
        app.manual_image,
        ui.Button({
          label: 'Load',
          onClick: app.manual_image_setup,
          style: {
            fontSize: '16px'
          }
        })
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });
  
  /* The visualization section. */
  app.vis = {
    label: ui.Label(),
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      items: Object.keys(app.VIS_OPTIONS),
      onChange: function() {
        // Update the label's value with the select's description.
        var option = app.VIS_OPTIONS[app.vis.select.getValue()];
        app.vis.label.setValue(option.description);
        // Refresh the map layer.
        app.refreshMapLayer();
      }
    })
  };
  
  /* The panel for the visualization section with corresponding widgets. */
  app.vis.panel = ui.Panel({
    widgets: [
      ui.Label('Visualise', {fontWeight: 'bold'}),
      app.vis.select,
      app.vis.label,
      ui.Button({
        label: 'Next', 
        onClick: app.setImage, 
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }        
      })
    ],
    style: app.SECTION_STYLE
  });

  // Default the select to the first value.
  app.vis.select.setValue(app.vis.select.items().get(0)); 
  
  app.regionSelect = {
    panel: ui.Panel([
      ui.Label({
        value: 'Region',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      ui.Label('Select the rectangular region of interest (1st click for top left corner, 2nd for bottom right)'),
      ui.Button({
        label: 'Select Region', 
        onClick: app.selectRegion, 
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      }),
      ui.Label('Select option above to set ROI or input decimal coordinates manually below'),
      app.position_inputs.panel,
      ui.Button({
        label: 'Create region from manual coordinates above', 
        onClick: app.setRegion, 
        style: {
          stretch:'horizontal'
        }
      }),
      ui.Button({
        label: 'Recentre on region', 
        onClick: app.centerRegion, 
        style: {
          stretch:'horizontal'
        }
      })
    ])
  };
  
  app.BCET = {
    panel: ui.Panel([
      ui.Label({
        value: 'Region',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      ui.Label('BCET region of interest (after Guo et al. 1991)'),
      ui.Button({
        label: 'BCET Region', 
        onClick: function(){
          var skip = false;
          app.BCETRegion(skip); 
        },
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      }),
      ui.Button({
        label: 'Skip', 
        onClick: function(){
          var skip = true;
          app.BCETRegion(skip); 
        }, 
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      })
    ])
  };
  
  app.BandSelectInputs = function(){
    var widgets = [
      ui.Label({
          value: 'Select Bands:',
          style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      })
    ];
    
    // Legacy code, when skipping BCET, still using BCET prefixes for variables
    
    app.BCET_R = ui.Select({
        items: app.BCET_BANDS,
        value: 'B5',
        placeholder: 'R',
        onChange: function() {
          app.refreshLayer();
        }
    });
    
    app.BCET_G = ui.Select({
        items: app.BCET_BANDS,
        value: 'B4',
        placeholder: 'G',
        onChange: function() {
          app.refreshLayer();
        }
    });
    
    app.BCET_B = ui.Select({
        items: app.BCET_BANDS,
        value: 'B3',
        placeholder: 'B',
        onChange: function() {
          app.refreshLayer();
        }
    });
    
    widgets.push(ui.Label({value: 'R', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_R);
    widgets.push(ui.Label({value: 'G', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_G);
    widgets.push(ui.Label({value: 'B', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_B);
    
    widgets.push(
      ui.Button({
        label: 'Export Tif', 
        onClick: function(){
          app.exportRegion();
        },
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      })      
    );
    
    for(var i = 0; i < widgets.length; i++){
       app.BCETBandSelect.panel.add(widgets[i]);
    }
  };
  
  app.PCA_INPUT_BANDS = [];
  app.PCA_BANDS = [];
  
  app.updatePCABands = function(){
    app.PCA_INPUT_BANDS = [];
    for (var i = 0; i < app.PCA_LAYERS.length; i++) {
      var input_name = app.PCA_LAYERS[i]+'_pca';
      if (app[input_name].getValue()){
        app.PCA_INPUT_BANDS.push(app.PCA_LAYERS[i]);
      }
    }
  };

  app.PCABandSelect = {
    panel: ui.Panel([
      ui.Label({
        value: 'Principal Component Bands:',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      })
    ])
  };
  
  app.PCA_LAYERS = false;
  
  app.PCAInputs = function(BCET){
    
    app.PCA_LAYERS = app.BCET_BANDS;

    for (var i = 0; i < app.PCA_LAYERS.length; i++) {
      var input_name = app.PCA_LAYERS[i]+'_pca';
      app[input_name] = ui.Checkbox({
        label: app.PCA_LAYERS[i],
        value: true,
        onChange: app.updatePCABands
      });
      app.PCABandSelect.panel.add(app[input_name]);
    }

    var gen_btn = ui.Button({
      label: 'Generate principal components', 
      onClick: function(){
        app.PCA_Processing();
      }, 
      style: {
        stretch:'horizontal',
        fontSize: '18px'
      }
    });
    app.PCABandSelect.panel.add(gen_btn);
    app.updatePCABands();
  };
  
  app.BCETBandSelectInputs = function(){
    
    var widgets = [
      ui.Label({
          value: 'Composite layer:',
          style: {fontWeight: 'bold', fontSize: '15px', margin: '10px 5px'}
      })
    ];

    app.BCET_R = ui.Select({
      items: app.BCET_BANDS,
      value: 'B5_BCET',
      placeholder: 'R',
      onChange: function(){
        app.refreshLayer();
      }
    });

    app.BCET_B = ui.Select({
      items: app.BCET_BANDS,
      value: 'B4_BCET',
      placeholder: 'B',
      onChange: function(){
        app.refreshLayer();
      }
    });
    
    app.BCET_G = ui.Select({
      items: app.BCET_BANDS,
      value: 'B3_BCET',
      placeholder: 'G',
      onChange: function(){
        app.refreshLayer();
      }
    });
    
    widgets.push(ui.Label({value: 'R', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_R);
    widgets.push(ui.Label({value: 'G', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_G);
    widgets.push(ui.Label({value: 'B', style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}}));
    widgets.push(app.BCET_B);
    
    widgets.push(
      ui.Button({
        label: 'Export Tif', 
        onClick: function(){
          app.exportRegion();
        },
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      })      
    );

    for(var i = 0; i < widgets.length; i++){
       app.BCETBandSelect.panel.add(widgets[i]);
    }
  };
  
  app.loadFusionTable = function(){
    var fusion_id = app.fusion_table_id.getValue();

    if(fusion_id){
      var fid_protocol = ee.String('ft:').cat(fusion_id).getInfo();
      var fusion_data = ee.FeatureCollection(fid_protocol);
      
      var names = ee.List(fusion_data.aggregate_array('name'));
      
      var getCoords = function(n){
        var latlon = ee.List(cc.get(n));
        var name = names.get(n);
        
        var coords = ee.Dictionary({
          lat:latlon.get(1),
          lon:latlon.get(0)
        });
        
        return [coords, name];
      };
    
      var cc = fusion_data.geometry().coordinates();
      
      var seq = ee.List.sequence(0, cc.length().subtract(1));
          
      var coord_data = seq.map(getCoords);
      
      var g = coord_data.length().getInfo();
      
      for(var i=0; i < g; i++){
        var cd = ee.List(coord_data.get(i));
        app.createPoint(ee.Dictionary(cd.get(0)), cd.get(1));
      }
      
      app.fusion_table_id.setValue('');
    }

  };
  
  app.edgeDetectLayer = function(){
    
    app.clearLayerAssets(['KirschFilter']);
    
    var kirsch_r0 = ee.Kernel.kirsch();
    var kirsch_r1 = kirsch_r0.rotate(1);
    var kirsch_r2 = kirsch_r0.rotate(2);
    var kirsch_r3 = kirsch_r0.rotate(3);
    
    // Make 45 degree Kirsch kernel
    var k45_top = [5, 5, -3];
    var k45_mid = [5, 0, -3];
    var k45_bot = [-3, -3, -3];
    var k45 = [k45_top, k45_mid, k45_bot];
    var kirch45_r0 = ee.Kernel.fixed(3,3,k45);
    var kirch45_r1 = kirch45_r0.rotate(1);
    var kirch45_r2 = kirch45_r0.rotate(2);
    var kirch45_r3 = kirch45_r0.rotate(3);
    
    var k_kernels = [kirsch_r0, kirsch_r1, kirsch_r2, kirsch_r3, kirch45_r0, kirch45_r1, kirch45_r2, kirch45_r3];
    var k_images = [];
    
    for(var i = 0; i < k_kernels.length; i++){
      k_images.push(app.CURRENT_IMAGE.select(['B1','B2', 'B3', 'B4', 'B5', 'B6', 'B7','B10']).convolve(k_kernels[i]));
    }
    
    var k_collection = ee.ImageCollection(k_images);
    var vr = k_collection.reduce(ee.Reducer.max());
    var k_thresh = vr.gt(app.thresholdSlider.getValue());
    
    Map.addLayer(k_thresh, false, 'KirschFilter', true, 0.3);    
  };
  
  app.pcImage = false;
  
  app.PCA_Map_Layer = { 
    panel: ui.Panel([ui.Label({
      value: 'Add PCA Layer:',
      style: {fontWeight: 'bold', fontSize: '10px'}
      })
    ])
  };
    
  app.showPCALayer = function(){
    var band = app.PCA_Layer_Select.getValue();
    Map.addLayer(app.pcImage.select([band]), {min: -2, max: 2}, band);  
  };
  
  app.PCA_Processing = function(){
    
    app.pcImage = app.getPrincipalComponents();
    
    var pcBands = app.pcImage.select(app.PCA_BANDS);
    
    app.CURRENT_IMAGE = app.CURRENT_IMAGE.addBands(pcBands);
    
    print('... pca processed ...');
    
    Map.addLayer(pcBands, {}, 'PCA Bands');
    
    app.PCA_Layer_Select = ui.Select({
      items: app.PCA_BANDS,
      value: 'PC_1',
      placeholder: 'Layer Name',
      onChange: function(){
        app.showPCALayer();
      }
    });
    
    app.PCA_add_btn = ui.Button({
      label: 'Add PCA layer', 
      onClick: function(){
        app.showPCALayer();
      }, 
      style: {
        stretch:'horizontal',
        fontSize: '18px'
      }
    });
    app.PCA_Map_Layer.panel.add(app.PCA_Layer_Select);
    app.PCA_Map_Layer.panel.add(app.PCA_add_btn);
    app.PCABandSelect.panel.style().set('shown', false);
  };
  
  app.getPrincipalComponents = function() {
    // Lifted from the GEE example!
    // https://developers.google.com/earth-engine/arrays_eigen_analysis
    // Collapse the bands of the image into a 1D array per pixel.
    
    print('Generating Principle Components...');
    
    var pca_target = app.CURRENT_IMAGE.select(app.PCA_INPUT_BANDS);
    var bandNames = pca_target.bandNames();
    
    var getNewBandNames = function(prefix) {
      var seq = ee.List.sequence(1, bandNames.length());
      return seq.map(function(b) {
        return ee.String(prefix).cat(ee.Number(b).int());
      });
    };

    if(app.roi){
      var meanDict = pca_target.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: app.roi,
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
  
      var means = ee.Image.constant(meanDict.values(bandNames));
      var centred = pca_target.subtract(means);
      var arrays = centred.toArray();
    
      // Compute the covariance of the bands within the region.
      var covar = arrays.reduceRegion({
        reducer: ee.Reducer.centeredCovariance(),
        geometry: app.roi,
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
      
    } else {
      var meanDict = pca_target.reduceRegion({
        reducer: ee.Reducer.mean(),
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });
  
      var means = ee.Image.constant(meanDict.values(bandNames));
      var centred = pca_target.subtract(means);
      var arrays = centred.toArray();
    
      // Compute the covariance of the bands within the region.
      var covar = arrays.reduceRegion({
        reducer: ee.Reducer.centeredCovariance(),
        crs: 'EPSG:4326',
        crsTransform: [0.00025,0,0,0,-0.00025,0],
        bestEffort:true
      });      
    }
    
    // Get the 'array' covariance result and cast to an array.
    // This represents the band-to-band covariance within the region.
    var covarArray = ee.Array(covar.get('array'));
  
    // Perform an eigen analysis and slice apart the values and vectors.
    var eigens = covarArray.eigen();
  
    // This is a P-length vector of Eigenvalues.
    var eigenValues = eigens.slice(1, 0, 1);
    // This is a PxP matrix with eigenvectors in rows.
    var eigenVectors = eigens.slice(1, 1);
  
    // Convert the array image to 2D arrays for matrix computations.
    var arrayImage = arrays.toArray(1);
    
    // Turn the square roots of the Eigenvalues into a P-band image.
    var sdImage = ee.Image(eigenValues.sqrt())
      .arrayProject([0]).arrayFlatten([getNewBandNames('sd')]);
    
    app.PCA_BANDS = getNewBandNames('PC_').getInfo();
    
    print('... complete ...');
    
    // Left multiply the image array by the matrix of eigenvectors.
    var principalComponents = ee.Image(eigenVectors)
      .matrixMultiply(arrayImage)
      .arrayProject([0])
      // Make the one band array image a multi-band image, [] -> image.
      .arrayFlatten([getNewBandNames('PC_')])
      // Normalize the PCs by their SDs.
      .divide(sdImage);
      
    return principalComponents
  };


  app.BCETBandSelect = {
    panel: ui.Panel([ui.Label('Processing BCET...')], ui.Panel.Layout.flow('horizontal'))
  };
  
  app.continueToPoint = {
    panel: ui.Panel([
      ui.Label('Choose bands for RGB viewing and point selection'),
      ui.Button({
        label: 'Continue to point selection', 
        onClick: function(){
          app.pointSetup();
        }, 
        style: {
          stretch:'horizontal',
          fontSize: '18px'
        }
      })
    ])
  };
  
  app.chartBandSelect = {
    panel: ui.Panel([
      ui.Label({
        value: 'Select Bands',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      })
    ])
  };
  
  app.coordMasterPanel = ui.Panel([]);
  
  app.sample_input = ui.Textbox({
    placeholder: 'Sample',
    style: {
      width: '150px'
    }
  });
  
  app.lat_input = ui.Textbox({
    placeholder: 'Lat',
    style: {
      width: '150px'
    }
  });
  
  app.lon_input = ui.Textbox({
    placeholder: 'Lon',
    style: {
      width: '150px'
    }
  });
  
  var addCoordBtn = ui.Button({
    label: 'Add', 
    onClick: app.addManualCoord,
    style: {
      fontSize: '16px'
    }
  });
  
  app.manualCoordForm = ui.Panel([
    app.sample_input,
    app.lat_input,
    app.lon_input,
    addCoordBtn
  ], ui.Panel.Layout.flow('horizontal'));
  
  app.fusion_table_id = ui.Textbox({
    placeholder: 'Fusion Table ID',
    style: {
      width: '250px'
    }
  });
  
  var loadFusionTableBtn = ui.Button({
    label: 'Plot', 
    onClick: app.loadFusionTable,
    style: {
      fontSize: '16px'
    }
  });
  
  var exportFusionTableValuesBtn = ui.Button({
    label: 'Export Values Only',
    onClick: function(){
      app.exportFusionTable();
    },
    style: {
      fontSize: '16px'
    }
  });
  
  app.fusionTableForm = ui.Panel([
    app.fusion_table_id,
    loadFusionTableBtn,
    exportFusionTableValuesBtn
    ],ui.Panel.Layout.flow('horizontal'));
  
  app.thresholdSlider = ui.Slider({
    min: 0,
    max: 1,
    value: 0.5,
    step: 0.1,
    onChange: app.edgeDetectLayer,
    style: {stretch: 'horizontal'}
  });
  
  app.edgeDetectPanel = ui.Panel([
    ui.Button({
      label: 'Kirsch Filter',
      onClick: function(){
        app.edgeDetectLayer();
      },
      style: {
        stretch:'horizontal'
      }
    }),
    app.thresholdSlider,
    ],ui.Panel.Layout.flow('horizontal'));
  
  app.pointSelect = {
    panel: ui.Panel([
      ui.Label({
        value: 'Edge Detect',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      app.edgeDetectPanel,
      ui.Label('Add a semi-transparent layer that highlights areas with higher constract gradients. These areas may be problematic for reliable point selection'),
      ui.Label({
        value: 'Points',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      app.coordMasterPanel,
      ui.Button({
        label: 'Select points on map',
        onClick: app.pointMapListen,
        style: {
          stretch:'horizontal'
        }
      }),
      ui.Label('Choose query points by clicking on map'),
      ui.Button({
        label: 'Pan Mode', 
        onClick: app.pointMapUnlisten, 
        style: {
          stretch:'horizontal'
        }
      }),
      ui.Label('Return to map exploration mode'),
      ui.Label({
        value: 'Add Points Manually',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      app.manualCoordForm,
      ui.Label({
        value: 'Import points from Fusion Table',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      app.fusionTableForm
    ])
  };
  
  app.export = {
    panel: ui.Panel([
      ui.Label({
        value: 'Export',
        style: {fontWeight: 'bold', fontSize: '18px', margin: '10px 5px'}
      }),
      ui.Button({
        label: 'Export pixel values to Google Drive (.csv)',
        onClick: function(){
          app.print_reflectance_data();
        },
        style: {
          stretch:'horizontal'
        }
      }),
      ui.Button({
        label: 'Export coordinates to Google Drive (.kmz)',
        onClick: function(){
          app.exportCoords();
        }, 
        style: {
          stretch:'horizontal'
        }
      }),
      ui.Label('(This will be stored as task that can be executed in the console above)'),
    ])
  };
  
  app.debug_start = {
    panel: ui.Panel([
      ui.Button({
        label: 'Start Debug',
        onClick: function(){
          app.debug_post_setup();
        },
        style: {
          stretch:'horizontal'
        }
      })
    ])
  };
  
  app.exportRegion = function(){
    Export.image.toDrive({
      image: app.CURRENT_IMAGE.select(app.BCETvisParams.bands),
      description: guid()+'_BCET_Export_' + app.project_variables.title    
    });
  };
};

app.selectCollection = function(collection){
    if(collection){
      app.COLLECTION_ID = collection;
    }
};

app.selectDataset = function(dataset){
  if(dataset == 'Landsat 8'){
    app.collection_picker.items().reset(app.LANDSAT_COLLECTIONS);
  } else if(dataset == 'Sentinel 2'){
    app.COLLECTION_ID = 'COPERNICUS/S2';
    app.collection_picker.items().reset(['COPERNICUS/S2']);
  }
  app.applyFilters();
};

app.createHelpers = function() {
  app.setLoadingMode = function(enabled) {
    // Set the loading label visibility to the enabled mode.
    app.filters.loadingLabel.style().set('shown', enabled);
    // Set each of the widgets to the given enabled mode.
    var loadDependentWidgets = [
      app.vis.select,
      app.filters.startDate,
      app.filters.endDate,
      app.filters.applyButton,
      app.filters.mapCenter,
      app.picker.select
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };
  
  app.cloudScore = function(img){
    
    // LIFTED FROM DOCUMENTATION
    
    // A helper to apply an expression and linearly rescale the output.
    var rescale = function(img, exp, thresholds) {
      return img.expression(exp, {img: img})
          .subtract(thresholds[0]).divide(thresholds[1] - thresholds[0]);
    };
  
    // Compute several indicators of cloudyness and take the minimum of them.
    var score = ee.Image(1.0);
    // Clouds are reasonably bright in the blue band.
    score = score.min(rescale(img, 'img.blue', [0.1, 0.3]));
  
    // Clouds are reasonably bright in all visible bands.
    score = score.min(rescale(img, 'img.red + img.green + img.blue', [0.2, 0.8]));
  
    // Clouds are reasonably bright in all infrared bands.
    score = score.min(
        rescale(img, 'img.nir + img.swir1 + img.swir2', [0.3, 0.8]));
  
    // Clouds are reasonably cool in temperature.
    score = score.min(rescale(img, 'img.temp', [300, 290]));
  
    // However, clouds are not snow.
    var ndsi = img.normalizedDifference(['green', 'swir1']);
    return score.min(rescale(ndsi, 'img', [0.8, 0.6]));    
  };
  
  app.cloudComposite = function(){
    if(app.COLLECTION_ID.slice(0, 7) == 'LANDSAT'){
      
      var start_date = app.filters.startDate.getValue();
      var end_date = app.filters.endDate.getValue();
      
      var LC8_BANDS = ['B2',   'B3',    'B4',  'B5',  'B6',    'B7',    'B10'];
      var STD_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'temp'];
      
      var cloud_collection = app.CURRENT_IMAGE = ee.ImageCollection(app.COLLECTION_ID)
      .filterDate(start_date, end_date)
      .map(function(img) {
        // Invert the cloudscore so 1 is least cloudy, and rename the band.
        var score = app.cloudScore(img.select(LC8_BANDS, STD_NAMES));
        score = ee.Image(1).subtract(score).select([0], ['cloudscore']);
        return img.addBands(score);
      });
      app.CURRENT_IMAGE = cloud_collection.qualityMosaic('cloudscore');
      
      Map.clear();
      app.VIS_OPTIONS = app.vis_params();
      var visOption = app.VIS_OPTIONS[app.vis.select.getValue()];
      Map.addLayer(app.CURRENT_IMAGE, visOption.visParams);

    } else {
      print('Can only perform cloud composite on Landat 8 collections');
    }
  };
  
  /** Applies the selection filters currently selected in the UI. */
  app.applyFilters = function() {
    app.setLoadingMode(true);

    var filtered = ee.ImageCollection(app.COLLECTION_ID);

    // Filter bounds to the map if the checkbox is marked.
    if (app.filters.mapCenter.getValue()) {
      filtered = filtered.filterBounds(Map.getCenter());
    }

    // Set filter variables.
    var start = app.filters.startDate.getValue();
    if (start) start = ee.Date(start);
    var end = app.filters.endDate.getValue();
    if (end) end = ee.Date(end);
    if (start) filtered = filtered.filterDate(start, end);

    // Get the list of computed ids.
    var computedIds = filtered
        .limit(app.IMAGE_COUNT_LIMIT)
        .reduceColumns(ee.Reducer.toList(), ['system:index'])
        .get('list');

    computedIds.evaluate(function(ids) {
      // Update the image picker with the given list of ids.
      app.setLoadingMode(false);
      app.picker.select.items().reset(ids);
      // Default the image picker to the first id.
      app.picker.select.setValue(app.picker.select.items().get(0));
    });
  };

  /** Refreshes the current map layer based on the UI widget states. */
  app.refreshMapLayer = function() {
    Map.clear();
    app.VIS_OPTIONS = app.vis_params();
    var imageId = app.picker.select.getValue();
    if (imageId) {
      // If an image id is found, create an image.
      var image_id_full = ee.String(app.COLLECTION_ID + '/').cat(imageId).getInfo();
      app.CURRENT_IMAGE = ee.Image(image_id_full);
      app.manual_image.setValue(image_id_full, false);
      // Add the image to the map with the corresponding visualization options.
      var visOption = app.VIS_OPTIONS[app.vis.select.getValue()];
      Map.addLayer(app.CURRENT_IMAGE, visOption.visParams, imageId);
    }
  };  
};

// Google chooser constants
app.createConstants = function(collection_ID) {
  app.LANDSAT_COLLECTIONS = [
      'LANDSAT/LC8_L1T_32DAY_TOA',
      'LANDSAT/LC8_L1T_8DAY_TOA',
    ];
  app.COLLECTION_ID = 'LANDSAT/LC8_L1T_32DAY_TOA';
  app.SECTION_STYLE = {margin: '20px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
  
  app.IMAGE_COUNT_LIMIT = 10;
  
  app.HEX_CODES = [
    'ff1111',
    'ffa811',
    '49ff00',
    '00e8ff',
    '0051ff',
    '9b00ff',
    'ff00d1',
    'ff0070',
    'ff9e00',
    'f7ff00',
    '00ff6c',
    '72ccff',
    'b0baff',
    'ebb0ff',
    'ffb0bc',
    'fffbb0',
    'b0ffc0' 
  ];
  
  // app.bcet_presets = ee.Dictionary({
  //   'B1': {'a':false, 'b':false, 'c':false},
  //   'B2': {'a':false, 'b':false, 'c':false},
  //   'B3': {'a':false, 'b':false, 'c':false},
  //   'B4': {'a':false, 'b':false, 'c':false},
  //   'B5': {'a':false, 'b':false, 'c':false},
  //   'B6': {'a':false, 'b':false, 'c':false},
  //   'B7': {'a':false, 'b':false, 'c':false},
  //   'B8': {'a':false, 'b':false, 'c':false},
  //   'B8A': {'a':false, 'b':false, 'c':false},
  //   'B9': {'a':false, 'b':false, 'c':false},
  //   'B10': {'a':false, 'b':false, 'c':false},
  //   'B11': {'a':false, 'b':false, 'c':false},
  //   'B12': {'a':false, 'b':false, 'c':false}
  // });
  
  app.VIS_OPTIONS = app.vis_params();
};

app.vis_params = function(){
  
  var vis_options = {};
  
  if(app.COLLECTION_ID.slice(0, 7) == 'LANDSAT'){
    // LANDSAT 8 PARAMETERS
    vis_options = {
      'Natural color (B4/B3/B2)': {
        description: 'Ground features appear in colors similar to their ' +
                     'appearance to the human visual system.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B4', 'B3', 'B2']}
      },
      'False color (B7/B6/B4)': {
        description: 'Vegetation is shades of red, urban areas are ' +
                     'cyan blue, and soils are browns.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B7', 'B6', 'B4']}
      },
      'Atmospheric (B7/B6/B5)': {
        description: 'Coast lines and shores are well-defined. ' +
                     'Vegetation appears blue.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B7', 'B6', 'B5']}
      }
    }; 
  } else {
     vis_options = {
      'Natural color (B4/B3/B2)': {
        description: 'Ground features appear in colors similar to their ' +
                     'appearance to the human visual system.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B4', 'B3', 'B2']}
      },
      'False color (B7/B6/B4)': {
        description: 'Vegetation is shades of red, urban areas are ' +
                     'cyan blue, and soils are browns.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B7', 'B6', 'B4']}
      },
      'Atmospheric (B7/B6/B5)': {
        description: 'Coast lines and shores are well-defined. ' +
                     'Vegetation appears blue.',
        visParams: {gamma: 1.3, min: 0, max: 0.3, bands: ['B7', 'B6', 'B5']}
      }
    // var reducers = ee.Reducer.mean().combine({
    //   reducer2: ee.Reducer.stdDev(),
    //   sharedInputs: true
    // });
    
    // var bands = ['B1'];
    // var stats = app.CURRENT_IMAGE.select(bands).reduceRegion({
    //   reducer: reducers,
    //   geometry: ee.Geometry(Map.getBounds(true)),
    //   scale: 30,
    //   maxPixels: 1e9
    // });
    
    // var s_mean = ee.Number(stats.get('B1_mean'));
    // var s_std = ee.Number(stats.get('B1_stdDev'));
    
    // var s_min = s_mean.subtract(s_std.multiply(2)).getInfo();
    // var s_max = s_mean.add(s_std.multiply(2)).getInfo();
    
    // // SENTINEL IMAGE PARAMETERS
    // vis_options = {
    //   'Natural color (B4/B3/B2)': {
    //     description: 'Ground features appear in colors similar to their ' +
    //                 'appearance to the human visual system.',
    //     visParams: {gamma: 1.3, min: s_min, max: s_max, bands: ['B4', 'B3', 'B2']}
    //   },
    //   'False color (B7/B6/B4)': {
    //     description: 'Vegetation is shades of red, urban areas are ' +
    //                 'cyan blue, and soils are browns.',
    //     visParams: {gamma: 1.3,  min: s_min, max: s_max, bands: ['B7', 'B6', 'B4']}
    //   },
    //   'Atmospheric (B7/B6/B5)': {
    //     description: 'Coast lines and shores are well-defined. ' +
    //                 'Vegetation appears blue.',
    //     visParams: {gamma: 1.3,  min: s_min, max: s_max, bands: ['B7', 'B6', 'B5']}
    //   }
    };
  }
  return vis_options;
};
  
app.debugSettings = function(){
  
  if(app.debug){
    
    app.skip_to_point_select = true;
    app.debug_start.panel.style().set('shown', true);
    app.intro.panel.style().set('shown', false);
    app.filters.panel.style().set('shown', false);
    app.picker.panel.style().set('shown', false);
    app.vis.panel.style().set('shown', false);
    app.BCET.panel.style().set('shown', false);
    app.BCETBandSelect.panel.style().set('shown', false);
    app.regionSelect.panel.style().set('shown', false);
    app.PCABandSelect.panel.style().set('shown', false);
    app.PCA_Map_Layer.panel.style().set('shown', false);
    app.continueToPoint.panel.style().set('shown', false);
    app.chartBandSelect.panel.style().set('shown', false);
    app.pointSelect.panel.style().set('shown', false);
    app.export.panel.style().set('shown', false);    
    var landsat8Toa = ee.ImageCollection('LANDSAT/LC8_L1T_32DAY_TOA');
    app.CURRENT_IMAGE = ee.Image(landsat8Toa.first());
    app.roi = ee.Geometry.Rectangle(-118.457336, 38.011311, -116.542969, 37.037639);
    var roi_coords = app.roi.coordinates().get(0);
    app.roi_outline = ee.Geometry.LineString(roi_coords);

    
  } else {
    app.debug_start.panel.style().set('shown', false);
    app.intro.panel.style().set('shown', true);
    app.filters.panel.style().set('shown', true);
    app.picker.panel.style().set('shown', true);
    app.vis.panel.style().set('shown', true);
    app.BCET.panel.style().set('shown', false);
    app.BCETBandSelect.panel.style().set('shown', false);
    app.regionSelect.panel.style().set('shown', false);
    app.PCABandSelect.panel.style().set('shown', false);
    app.PCA_Map_Layer.panel.style().set('shown', false);
    app.continueToPoint.panel.style().set('shown', false);
    app.chartBandSelect.panel.style().set('shown', false);
    app.pointSelect.panel.style().set('shown', false);
    app.export.panel.style().set('shown', false);
    app.roi = false;
  }
};

app.debug_post_setup = function(){
  if(app.debug){
    if(app.skip_to_point_select){
      app.BCETRegion(false);
    }
  }
};

app.boot = function(){
  // DEBUG ROUTINE
  app.debug = false;
  
  app.createConstants();
  app.createHelpers();
  app.createInputs();
  app.createPanels();
  
  app.debugSettings();
  
  var main = ui.Panel({
    widgets: [
      app.debug_start.panel,
      app.intro.panel,
      app.filters.panel,
      app.picker.panel,
      app.vis.panel,
      app.regionSelect.panel,
      app.BCET.panel,
      app.BCETBandSelect.panel,
      app.PCABandSelect.panel,
      app.PCA_Map_Layer.panel,
      app.continueToPoint.panel,
      app.chartBandSelect.panel,
      app.pointSelect.panel,
      app.export.panel
    ],
    style: {width: '600px', padding: '8px'}
  });

  // Default to Death Valley
  Map.setCenter(-116.886349,  36.185684, 10);
  ui.root.insert(0, main);
  app.applyFilters();
  
};

app.boot();
