/* eslint-disable no-param-reassign */
import React, { Component } from 'react';
import { navigateTo } from 'gatsby-link';

import { Map, TileLayer, WMSTileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.sync';
import 'leaflet-sleep';
// import 'leaflet-minimap';
// import 'leaflet-minimap/src/Control.MiniMap.css';

import 'leaflet/dist/leaflet.css';
import classes from './SyncedMaps.module.scss';

// import ALL_LAYERS from '../settings/layers';

import markerIcons from '../helpers/markerIcons';

const SYNC_OPTIONS = {
  syncCursor: true,
};

const syncMaps = maps => {
  maps.forEach(map => map.invalidateSize(false));
  maps.forEach(mapA =>
    maps.forEach(mapB => {
      if (mapA !== mapB && !mapA.isSynced(mapB)) {
        mapA.sync(mapB, SYNC_OPTIONS);
      }
    }));
};

const unsyncMaps = maps => {
  maps.forEach(mapA =>
    maps.forEach(mapB => {
      if (mapA !== mapB && mapA.isSynced(mapB)) {
        mapA.unsync(mapB);
      }
    }));
};

const AutoLayer = props => {
  let Layer = TileLayer;
  const customProps = {};
  const { wms, geojson } = props;

  if (wms) {
    Layer = WMSTileLayer;
  }

  if (geojson) {
    Layer = GeoJSON;

    // Define default marker for GeoJSON points
    customProps.pointToLayer = (feature, latlng) =>
      L.marker(latlng, { icon: markerIcons.default });
  }

  return <Layer {...props} {...customProps} />;
};

class SyncedMaps extends Component {
  constructor (props) {
    super(props);
    this.mapRefs = [];

    // this.miniMap = new L.Control.MiniMap(
    //   new L.TileLayer(ALL_LAYERS.osm.url),
    //   {
    //     position: 'bottomleft',
    //     mapOptions: {
    //       sleep: false,
    //     },
    //   },
    // );

    this.initTile = L.GridLayer.prototype._initTile; // eslint-disable-line no-underscore-dangle
  }

  componentDidMount () {
    const { updateMapRef } = this.props;
    // this.bindMiniMap();
    syncMaps(this.mapRefs);
    if (typeof updateMapRef === 'function') {
      updateMapRef(this.mapRefs[0]);
    }
    this.fractionalTransform();
  }

  componentDidUpdate () {
    const { updateMapRef } = this.props;

    // this.bindMiniMap();
    syncMaps(this.mapRefs);
    if (typeof updateMapRef === 'function') {
      updateMapRef(this.mapRefs[0]);
    }
    this.fractionalTransform();
  }

  componentWillUnmount () {
    unsyncMaps(this.mapRefs);
  }

  // bindMiniMap () {
  //   if (this.miniMap) {
  //     this.miniMap.remove();

  //     if (this.mapRefs.length === 1) {
  //       this.miniMap.addTo(this.mapRefs[0]);
  //     }
  //   }
  // }

  /*
  * Workaround for 1px lines appearing in some browsers due to fractional transforms
  * and resulting anti-aliasing.
  * https://github.com/Leaflet/Leaflet/issues/3575
  */
  fractionalTransform () {
    const self = this;
    L.GridLayer.include({
      _initTile (tile) { // eslint-disable-line no-underscore-dangle
        self.initTile.call(this, tile);

        const tileSize = this.getTileSize();
        tile.style.width = `${tileSize.x + 1}px`;
        tile.style.height = `${tileSize.y + 1}px`;
      },
    });
  }

  render () {
    unsyncMaps(this.mapRefs);
    this.mapRefs = [];

    const { maps, mapsProps, markers } = this.props;

    return (
      <div className={classes.syncedMaps}>
        {maps.filter(map => !!map).map(map => (
          <Map
            key={JSON.stringify(map.layers && map.layers[0])}
            ref={ref => { ref && this.mapRefs.push(ref.leafletElement); }}
            {...mapsProps}
            zoomControl={false}
          >
            {map.layers && map.layers.map(layer => (
              <AutoLayer
                key={JSON.stringify(layer)}
                {...layer}
              />
            ))}
            {markers.map(({ position, title, slug, icon }) => (
              <Marker
                key={JSON.stringify(position)}
                position={position}
                icon={markerIcons[icon] || markerIcons.default}
                onClick={() => (slug && navigateTo(slug))}
              >
                {title && <Tooltip><span>{title}</span></Tooltip>}
              </Marker>
            ))}
          </Map>
        ))}
      </div>
    );
  }
}

/**
 * Avoid calling SyncedMap component on html pre-rendering
 */
const SyncedMapsWrapper = props => (typeof window !== 'undefined' ? <SyncedMaps {...props} /> : null);

export default SyncedMapsWrapper;
