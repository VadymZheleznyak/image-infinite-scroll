import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageInfiniteScrollComponent } from './image-infinite-scroll.component';

describe('ImageInfiniteScrollComponent', () => {
  let component: ImageInfiniteScrollComponent;
  let fixture: ComponentFixture<ImageInfiniteScrollComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageInfiniteScrollComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageInfiniteScrollComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
