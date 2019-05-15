import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { DomoticzStatus } from '@nd/core/models/domoticz-status.interface';

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
        <span *ngIf="status?.status !== 'OK'">no connection</span>
        <ng-container *ngIf="status?.status === 'OK'">
          <span>Domoticz version: {{ status.version }}</span>
          <span>Status: {{ status.status }}</span>
        </ng-container>
      </div>
    </div>
  `,
  styleUrls: ['./settings-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsContentComponent {

  @Input() parent: FormGroup;

  @Input() status: DomoticzStatus;

  getControl(name: string) {
    return this.parent.get(name) as FormControl;
  }

  getInvalid(name: string) {
    return this.getControl(name).invalid && !!this.getControl(name).value;
  }

}
