import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ImageInfiniteScrollComponent } from './image-infinite-scroll.component';

@NgModule({
  declarations: [ImageInfiniteScrollComponent],
  imports: [ BrowserModule ],
  exports: [ImageInfiniteScrollComponent]
})
export class ImageInfiniteScrollModule { }
