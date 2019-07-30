import { TestBed } from '@angular/core/testing';

import { ImageInfiniteScrollService } from './image-infinite-scroll.service';

describe('ImageInfiniteScrollService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ImageInfiniteScrollService = TestBed.get(ImageInfiniteScrollService);
    expect(service).toBeTruthy();
  });
});
