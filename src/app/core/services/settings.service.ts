import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpEvent, HttpBackend } from '@angular/common/http';

import { Observable } from 'rxjs';

import { Api } from '@nd/core/enums/api.enum';
import { DomoticzAuth, DomoticzSettings } from '@nd/core/models';
import { map } from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class SettingsService {

  private httpClient: HttpClient;

  constructor(handler: HttpBackend) {
    this.httpClient = new HttpClient(handler);
  }

  getAuth(settings: DomoticzSettings): Observable<DomoticzAuth> {
    let req = new HttpRequest<DomoticzAuth>('GET',
      `${settings.ssl ? 'https' : 'http'}://${settings.ip}:${settings.port}/${Api.auth}`
    );
    try {
      if (!!Object.keys(settings.credentials).every(key => settings.credentials[key] !== null)) {
        const authToken = btoa(`${settings.credentials.username}:${settings.credentials.password}`);
        req = req.clone({
          headers: req.headers.set('Authorization', `Basic ${authToken}`)
        });
      }
    } catch (e) { }
    return this.httpClient.request<DomoticzAuth>(req.method, req.url, { headers: req.headers });
  }

}
