// CentralnyMagazynStanu.js
// Minimalny singleton centralnego magazynu stanu dla aplikacji
(function(global){
  class CentralnyMagazynStanu {
    constructor(){
      this.state = {
        warehouseItems: [],
        materialTemplates: [],
        settings: {}
      };
      this.storageKey = 'centralny_magazyn_state_v1';
      this._loaded = false;
    }

    load(){
      try{
        const raw = localStorage.getItem(this.storageKey);
        if(raw){
          const parsed = JSON.parse(raw);
          this.state = Object.assign(this.state, parsed || {});
        }
      }catch(e){
        console.warn('CentralnyMagazynStanu: load error', e);
      }
      this._loaded = true;
      return this.state;
    }

    save(){
      try{
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      }catch(e){
        console.warn('CentralnyMagazynStanu: save error', e);
      }
    }

    getStan(){
      if(!this._loaded) this.load();
      return this.state;
    }

    addItem(item){
      this.state.warehouseItems = this.state.warehouseItems || [];
      this.state.warehouseItems.push(item);
      this.save();
      return item;
    }

    updateItem(index, data){
      if(!this.state.warehouseItems || !this.state.warehouseItems[index]) return null;
      Object.assign(this.state.warehouseItems[index], data);
      this.save();
      return this.state.warehouseItems[index];
    }

    removeItem(index){
      if(!this.state.warehouseItems) return;
      this.state.warehouseItems.splice(index,1);
      this.save();
    }

    clear(){
      this.state.warehouseItems = [];
      this.save();
    }
  }

  let instance = null;
  global.CentralnyMagazynStanu = {
    getInstance: function(){
      if(!instance) instance = new CentralnyMagazynStanu();
      return instance;
    }
  };

})(window || this);

// Dodatkowo udostępnij globalny alias dla wygody
window.getCentralnyMagazyn = function(){ return window.CentralnyMagazynStanu.getInstance(); };
