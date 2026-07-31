import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icon } from './icon';

describe('Icon', () => {
  let component: Icon;
  let fixture: ComponentFixture<Icon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Icon],
    }).compileComponents();

    fixture = TestBed.createComponent(Icon);
    component = fixture.componentInstance;
    component.name = 'user';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an svg for the given icon name', () => {
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('fills the heart icon only when filled is true', () => {
    component.name = 'heart';
    component.filled = false;
    fixture.detectChanges();
    const outlineSvg = fixture.nativeElement.querySelector('svg');
    expect(outlineSvg.getAttribute('fill')).toBe('none');
  });

  it('fills the heart icon when filled is true', () => {
    const filledFixture = TestBed.createComponent(Icon);
    filledFixture.componentInstance.name = 'heart';
    filledFixture.componentInstance.filled = true;
    filledFixture.detectChanges();
    const filledSvg = filledFixture.nativeElement.querySelector('svg');
    expect(filledSvg.getAttribute('fill')).toBe('currentColor');
  });
});
