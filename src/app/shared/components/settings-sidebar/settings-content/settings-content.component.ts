import { Component, ChangeDetectionStrategy, Input, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { DomoticzStatus } from '@nd/core/models/domoticz-status.interface';
import { BaseUrl } from '@nd/core/models';

@Component({
  selector: 'nd-settings-content',
  template: `
    <div class="content-container" [formGroup]="parent">
      <div class="form-container">
        <div class="form-group">
          <nb-checkbox [status]="status?.status === 'OK' ? 'success' : 'warning'" formControlName="ssl">
            SSL (mandatory for service worker support)
          </nb-checkbox>
        </div>
        <div class="form-group">
          <input nbInput formControlName="ip" type="text" class="form-control" placeholder="domoticz ip adress"
            [ngClass]="{ 'input-danger': getInvalid('ip'), 'input-success': status?.status === 'OK' }">
          <div class="error-message" *ngIf="getInvalid('ip')">
            Not a valid ip adress
          </div>
        </div>
        <div class="form-group">
          <input nbInput formControlName="port" type="text" class="form-control" placeholder="port"
            [ngClass]="{ 'input-danger': getInvalid('port'), 'input-success': status?.status === 'OK' }">
          <div class="error-message" *ngIf="getInvalid('port')">
            Not a valid port number
          </div>
        </div>
      </div>

      <div class="connection-state {{ status?.status === 'OK' ? 'success' : 'danger' }}">
        <span *ngIf="status?.status !== 'OK' else domoticzStatus">no connection</span>
        <ng-template #domoticzStatus>
          <span>Domoticz version: {{ status.version }}</span>
          <span>Status: {{ status.status }}</span>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['./settings-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsContentComponent implements OnDestroy {

  @Input() parent: FormGroup;

  @Input() status: DomoticzStatus;

  private _baseUrl: BaseUrl;
  @Input()
  set baseUrl(value: BaseUrl) {
    if (!!value) {
      // https://github.com/angular/angular/issues/27803
      if (!this.getControl('ssl')) {
        this.parent.addControl('ssl', new FormControl(value.ssl));
      } else {
        this.getControl('ssl').setValue(value.ssl, { emitEvent: false });
      }
      this.getControl('ip').setValue(value.ip, { emitEvent: false });
      this.getControl('port').setValue(value.port, { emitEvent: false });
      this.parent.updateValueAndValidity();
    }
    this._baseUrl = value;
  }
  get baseUrl() { return this._baseUrl; }

  getControl(name: string) {
    return this.parent.get(name) as FormControl;
  }

  getInvalid(name: string) {
    return this.getControl(name).invalid && !!this.getControl(name).value;
  }

  ngOnDestroy() {
    this.parent.removeControl('ssl');
  }

}
