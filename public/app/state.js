class State {
  constructor() {
    this.pstate_ = {
      version: '1.0',
      gridData: null,
      desc: null,
      // Map cell key to a map which maps layer IDs to the content of that
      // layer.
      // "Content" is a mapping of content key (ck) to content type (ct) IDs.
      content: {},
      lastOpNum: 0,
    };

    this.metadata = {};

    this.theMap = new TheMap();

    this.mid_ = null;

    this.secret_ = null;

    this.gesture_ = null;

    this.opCenter = new OperationCenter();

    this.navigation = {
      scale: 1.0,
      translate: {
        x: 8,
        y: 8,
      },
    };

    this.defaultFloorContent_ = {
      [ck.kind]: ct.floors.floor.id,
      [ck.variation]: ct.floors.floor.generic.id,
    };

    this.defaultGridData_ = {
      from: 0,
      to: 25,
    };

    this.defaultDesc_ = {title: 'Unnamed', long: ''};

    this.autoSaveTimerId_ = null;

    this.pendingOperations_ = [];

    this.currentlySendingOperations_ = false;

    this.lastAppliedOperation_ = null;

    this.user = null;

    this.menu = null;

    this.clipboard = null;
  }
  
  set gesture(newGesture) {
    if (this.gesture_) this.gesture_.onUnselect();
    this.gesture_ = newGesture;
  }
  
  get gesture() {
    return this.gesture_;
  }

  setLastOpNum(num) {
    this.pstate_.lastOpNum = num;
  }

  getLastOpNum() {
    return this.pstate_.lastOpNum;
  }

  getLayerContent(cellKey, layer) {
    const content = this.pstate_.content || null;
    const cellContent = content ? content[cellKey] : null;
    const layerContent = cellContent ? cellContent[layer.id] : null;
    if (!layerContent && layer == ct.floors) {
      // Missing floor translates to the default floor content.
      return this.defaultFloorContent_;
    }
    return layerContent || null;
  }

  setLayerContent(cellKey, layer, content) {
    if (!this.pstate_.content) {
      this.pstate_.content = {};
    }
    let cellContent = this.pstate_.content[cellKey];
    if (!cellContent) {
      if (!content) return;
      cellContent = {};
      this.pstate_.content[cellKey] = cellContent;
    } else if (!content) {
      delete cellContent[layer.id];
      return;
    }
    if (layer == ct.floors &&
        Object.keys(content).length == 2 &&
        content[ck.kind] == this.defaultFloorContent_[ck.kind] &&
        content[ck.variation] == this.defaultFloorContent_[ck.variation]) {
      // If it's the floor layer with a content equivalent to the default
      // floor, it can be deleted.
      delete cellContent[layer.id];
      return;
    }
    cellContent[layer.id] = content;
  }

  getGridData() {
    return this.pstate_.gridData || this.defaultGridData_;
  }

  setGridData(gridData) {
    if (gridData && gridData.from == this.defaultGridData_.from &&
        gridData.to == this.defaultGridData_.to) {
      gridData = null;
    }
    this.pstate_.gridData = gridData;
  }

  getDesc() {
    return this.pstate_.desc || this.defaultDesc_;
  }

  setDesc(desc) {
    if (desc && desc.title == this.defaultDesc_.title &&
        desc.long == this.defaultDesc_.long) {
      desc = null;
    }
    this.pstate_.desc = desc;
  }

  setMid(mid) {
    this.mid_ = mid;
    const newUrl = 'index.html?mid=' + encodeURIComponent(this.mid_);
    window.history.replaceState(null, '', newUrl);
  }

  setSecret(secret, callback) {
    this.secret_ = secret;
    if (!this.user) {
      setStatus(Status.AUTH_ERROR);
      return;
    }
    firebase.database().ref(`/users/${this.user.uid}/secrets/${this.mid_}`)
        .set(secret, error => {
      setStatus(Status.AUTH_ERROR);
    }).then(() => callback());
    const newUrl = `index.html?mid=${encodeURIComponent(this.mid_)}` +
        `&secret=${encodeURIComponent(secret)}`;
    window.history.replaceState(null, '', newUrl);
  }

  getMid() {
    return this.mid_;
  }

  getSecret() {
    return this.secret_;
  }

  load(pstate) {
    this.pstate_ = pstate;
    createTheMapAndUpdateElements();
  }

  setupNewMid(callback) {
    this.setMid('m' + this.generateRandomString_());
    this.setSecret('s' + this.generateRandomString_(), callback);
  }

  // Create a random 10-character string with characters belonging to [a-z0-9].
  generateRandomString_() {
    // From http://stackoverflow.com/a/19964557
    return (Math.random().toString(36)+'00000000000000000').slice(2, 12);
  }
}
