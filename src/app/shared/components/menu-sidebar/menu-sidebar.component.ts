import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';

import { NbMenuItem, NbMenuService } from '@nebular/theme';
import { fromEvent, Subject } from 'rxjs';
import { tap, filter, takeUntil, take } from 'rxjs/operators';

@Component({
  selector: 'nd-menu-sidebar',
  template: `
    <div id="menu-sidebar" class="{{ animationState }}">
      <div class="menu-container {{ animationState }}">
        <nb-menu id="menu" tag="menu" [items]="items">
        </nb-menu>
      </div>
    </div>
  `,
  styleUrls: ['./menu-sidebar.component.scss']
})

export class MenuSidebarComponent implements OnInit, OnDestroy {

  private unsubscribe$ = new Subject();

  @Input() animationState: string;

  @Output() outsideClick = new EventEmitter();

  items: NbMenuItem[] = [
    {
      title: 'Switches',
      link: '/devices/switches',
      icon: 'toggle-left-outline'
    },
    {
      title: 'Temperature',
      link: '/devices/temperature',
      icon: 'thermometer-outline'
    }
  ];

  constructor(private menuService: NbMenuService) { }

  ngOnInit() {
    fromEvent(document, 'click').pipe(
      tap(event => {
        event.preventDefault();
        event.stopPropagation();
      }),
      filter((event: any) => this.animationState === 'in' && event.target.id !== 'menu' &&
        event.target.id !== 'menu-icon'),
      tap(() => this.outsideClick.emit()),
      takeUntil(this.unsubscribe$)
    ).subscribe();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

}
