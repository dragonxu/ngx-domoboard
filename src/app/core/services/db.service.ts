import { Injectable } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, pluck } from 'rxjs/operators';

import { DomoticzSettings } from '@nd/core/models';

interface State {
  settings: DomoticzSettings;
  pushSubscription: PushSubscription;
  monitoredDevices: any[];
  deviceIcons: string[];
}

@Injectable({ providedIn: 'root' })
export class DBService {
  private subject = new BehaviorSubject<State>({} as State);
  store = this.subject
    .asObservable()
    .pipe(
      distinctUntilChanged((x, y) => JSON.stringify(x) === JSON.stringify(y))
    );

  db: IDBDatabase;

  DB_NAME = 'NDDB';

  // upgrade version to trigger onupgradeneeded event
  DB_VERSION = 2;

  SETTINGS_STORE = 'domoticz_settings';

  PUSHSUB_STORE = 'push_subscription';

  ICON_STORE = 'device_icon';

  MONITOR_STORE = 'monitored_device';

  select<T>(...name: string[]): Observable<T> {
    return this.store.pipe(pluck(...name));
  }

  openDb(): Promise<any> {
    const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve((this.db = evt.target.result));
      }.bind(this);

      req.onerror = function(evt) {
        reject('openDb: ' + evt.target['error'].message);
      };

      req.onupgradeneeded = function(evt) {
        this.createStore(this.SETTINGS_STORE, 'id', evt);
        this.createStore(this.PUSHSUB_STORE, 'id', evt);
        this.createStore(this.ICON_STORE, 'idx', evt);
        this.createStore(this.MONITOR_STORE, 'idx', evt);
      }.bind(this);
    });
  }

  createStore(storeName: string, keyPath: string, evt: any) {
    const db = evt.target.result as IDBDatabase;
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, {
        keyPath
      });
    }
  }

  getObjectStore(store_name: string, mode?: any) {
    let tx: IDBTransaction;
    if (mode) {
      tx = this.db.transaction(store_name, mode);
    } else {
      tx = this.db.transaction(store_name);
    }
    return tx.objectStore(store_name);
  }

  addSettings(settings: DomoticzSettings): Promise<any> {
    const store = this.getObjectStore(this.SETTINGS_STORE, 'readwrite');
    try {
      if (
        !!Object.keys(settings.credentials).every(
          key => settings.credentials[key] !== null
        )
      ) {
        const authToken = btoa(
          `${settings.credentials.username}:${settings.credentials.password}`
        );
        settings.authToken = authToken;
        delete settings.credentials;
      }
    } catch (e) {}
    const req = store.put({ id: 1, ...settings });
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve('addSettings: ' + evt.type);
      };

      req.onerror = function(evt) {
        reject('addSettings: ' + evt.target['error'].message);
      };
    });
  }

  addPushSub(pushSubscription: PushSubscription): Promise<any> {
    const store = this.getObjectStore(this.PUSHSUB_STORE, 'readwrite');
    const req = store.put({
      id: 1,
      pushSubscription: pushSubscription.toJSON()
    });
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve('addPushSub: ' + evt.type);
      };
      req.onerror = function(evt) {
        reject('addPushSub: ' + evt.target['error'].message);
      };
    });
  }

  addMonitoredDevice(device: any) {
    const store = this.getObjectStore(this.MONITOR_STORE, 'readwrite');
    const req = store.put({ idx: device.idx, monitoredDevice: device });
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve('addMonitoredDevice: ' + evt.type);
      };
      req.onerror = function(evt) {
        reject('addMonitoredDevice: ' + evt.target['error'].message);
      };
    });
  }

  deleteMonitoredDevice(device: any) {
    const store = this.getObjectStore(this.MONITOR_STORE, 'readwrite');
    const req = store.delete(device.idx);
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve('deleteMonitoredDevice: ' + evt.type);
      };
      req.onerror = function(evt) {
        reject('addMonitoredDevice: ' + evt.target['error'].message);
      };
    });
  }

  syncSettings(settings?: DomoticzSettings) {
    if (!!settings) {
      this.subject.next({
        ...this.subject.value,
        settings: null
      });
    } else {
      const req = this.getObjectStore(this.SETTINGS_STORE, 'readonly').get(1);
      req.onsuccess = ((evt: any) => {
        this.subject.next({
          ...this.subject.value,
          settings: this.decodeSettings(evt.target.result)
        });
      }).bind(this);
    }
  }

  clearSettings() {
    const store = this.getObjectStore(this.SETTINGS_STORE, 'readwrite');
    const req = store.clear();
    return new Promise<any>((resolve, reject) => {
      req.onsuccess = function(evt: any) {
        resolve('clearSettings: ' + evt.type);
      };
      req.onerror = function(evt) {
        reject('clearSettings: ' + evt.target['error'].message);
      };
    });
  }

  syncPushSub(pushSubscription: PushSubscription) {
    const req = this.getObjectStore(this.PUSHSUB_STORE, 'readonly').get(1);
    req.onsuccess = ((evt: any) => {
      if (!!evt.target.result) {
        this.subject.next({
          ...this.subject.value,
          pushSubscription: evt.target.result.pushSubscription
        });
      } else {
        this.subject.next({
          ...this.subject.value,
          pushSubscription
        });
      }
    }).bind(this);
  }

  syncDeviceIcon(idx: string, icon: string) {
    const req = this.getObjectStore(this.ICON_STORE, 'readonly').get(idx);
    req.onsuccess = ((evt: any) => {
      const store = evt.target.result;
      this.subject.next({
        ...this.subject.value,
        deviceIcons: [
          ...this.subject.value.deviceIcons,
          store ? store.deviceIcon : icon
        ]
      });
    }).bind(this);
  }

  syncMonitoredDevice(device: any) {
    const req = this.getObjectStore(this.ICON_STORE, 'readonly').get(
      device.idx
    );
    req.onsuccess = ((evt: any) => {
      const store = evt.target.result;
      this.subject.next({
        ...this.subject.value,
        monitoredDevices: [
          ...this.subject.value.monitoredDevices,
          store ? store.monitoredDevice : device
        ]
      });
    }).bind(this);
  }

  decodeSettings(settings: DomoticzSettings): DomoticzSettings {
    if (!!settings && !!settings.authToken) {
      return {
        ...settings,
        credentials: {
          username: atob(settings.authToken).split(':')[0],
          password: atob(settings.authToken).split(':')[1]
        }
      };
    } else {
      return settings;
    }
  }

  getAllStore(store: string) {
    const req = this.getObjectStore(store, 'readonly').getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = (evt: any) => resolve(evt.target.result || []);
      req.onerror = (evt: any) => reject(evt.target['error'].message);
    });
  }
}
