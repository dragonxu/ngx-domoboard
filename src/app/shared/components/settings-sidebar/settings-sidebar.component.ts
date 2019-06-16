import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormControl, ValidatorFn, FormGroup, ValidationErrors } from '@angular/forms';

import { filter, switchMap, catchError, tap, distinctUntilChanged, finalize } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { DomoticzSettings, DomoticzAuth } from '@nd/core/models';
import { SettingsService, DBService } from '@nd/core/services';

const oneFilledOutValidator: ValidatorFn = (group: FormGroup): ValidationErrors | null => {
  return Object.keys(group.value).every(key => !!group.value[key]) ||
    Object.keys(group.value).every(key => !group.value[key]) ? null : { oneFilledOut: true };
};

@Component({
  selector: 'nd-settings-sidebar',
  template: `
    <div class="sidebar-container">
      <nd-toggle-settings-button class="settings-button" (slideIn)="show()"
        [animationState]="animationState" (slideOut)="hide()">
      </nd-toggle-settings-button>
      <div class="settings-container {{ animationState }}">
        <nd-settings-content *ngIf="showContent" class="sidebar-content"
          [parent]="settingsForm" [auth]="auth$ | async" [settings]="settings$ | async"
          [loading]="loading">
        </nd-settings-content>
      </div>
    </div>
  `,
  styleUrls: ['./settings-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsSidebarComponent implements OnInit {

  animationState = 'out';

  showContent: boolean;

  settings$ = this.dbService.store;

  portPattern = '([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])';

  loading: boolean;

  settingsForm = this.fb.group({
    ssl: [null],
    domain: [null, [Validators.required]],
    port: [null, [Validators.pattern(this.portPattern), Validators.required]],
    credentials: this.fb.group({
      username: [null],
      password: [null]
    }, { validators: oneFilledOutValidator })
  });

  auth$: Observable<DomoticzAuth> = this.settingsForm.valueChanges.pipe(
    distinctUntilChanged((x, y) => JSON.stringify(x) === JSON.stringify(y)),
    tap(value => {
      if (this.settingsForm.invalid) {
        this.dbService.setSettings(value);
      }
    }),
    filter(() => this.settingsForm.valid),
    switchMap(value => {
      this.loading = true;
      return this.service.getAuth(value as DomoticzSettings).pipe(
        tap(auth => {
          if (auth.status === 'OK' && auth.rights > -1) {
            this.dbService.addSettings(value as DomoticzSettings).then(s => {
              this.dbService.setSettings();
              console.log(s);
            }).catch(e => {
              this.dbService.setSettings();
              console.log(e);
            });
          } else {
            this.dbService.setSettings(value);
            this.settingsForm.get('credentials').setErrors({ 'invalid': true });
          }
        }),
        catchError(e => {
          this.dbService.setSettings(value);
          return of({} as DomoticzAuth);
        }),
        finalize(() => this.loading = false)
      );
    })
  );

  constructor(
    private cd: ChangeDetectorRef,
    private fb: FormBuilder,
    private service: SettingsService,
    private dbService: DBService
  ) { }

  ngOnInit() {
    this.dbService.openDb().then(() => this.dbService.setSettings());
  }

  getControl(name: string) {
    return this.settingsForm.get(name) as FormControl;
  }

  show() {
    this.animationState = 'in';
    this.showContent = true;
    this.settingsForm.enable();
  }

  hide() {
    this.animationState = 'out';
    this.settingsForm.disable();
    // Wait animation duration to destroy content.
    setTimeout(() => {
      this.showContent = false;
      this.cd.detectChanges();
    }, 400);
  }

}
