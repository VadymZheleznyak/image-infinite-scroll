import { Component, OnInit, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'image-infinite-scroll',
  templateUrl: './image-infinite-scroll.component.html',
  styleUrls: ['./image-infinite-scroll.component.css']
})

export class ImageInfiniteScrollComponent implements OnInit {

  constructor(private sanitizer: DomSanitizer) { }

  @Input() imagesList: string[] = [];
  @Input() pageSize: number = 0;
  @Input() pageIndex: number = 0;
  @Input() totalRecords: number = 0;
  @Input() totalPages: number = 0;
  @Output() scroll = new EventEmitter();

  readonly contentId: string = "content";
  readonly panelId: string = "div-select";
  readonly loaderId: string = "loader-wrapper";
  readonly leftScrollDivId: string = "left-Div";
  readonly rightScrollDivId: string = "right-Div";

  isScrolling;
  scrollWidth: number;
  maxPanelSize: number;
  baseSelect: BaseSelect;
  isLastPage: boolean = false;
  blockScroll: boolean = false;
  scrollLeftOffset: number = 0;
  startBottomDivOffset: number;
  imagesModels: ImageModel[] = [];
  scrollArrayHasNewValues: boolean = false;
  readonly scrollConstOptionWidth: number = 90;

  divSelect: HTMLElement;
  divWithContent: HTMLElement;
  leftScrollDiv: HTMLElement;
  rightScrollDiv: HTMLElement;

  ngOnInit() {
    this.baseSelect = new BaseSelect(1,50,20);
  }

  ngAfterViewInit(){
    this.divSelect = document.getElementById(this.panelId);
    this.divWithContent = document.getElementById(this.contentId);
    if(this.divSelect && this.divWithContent) this.addEventListeners();
  }

  ngOnChanges(changes: SimpleChanges){
    if(changes['imagesList']){
      if(changes['imagesList'].currentValue.length && !this.imagesModels.length)
      {
        this.baseSelect.PageNumber = this.pageIndex;
        this.baseSelect.TotalRecords = this.totalRecords;
        this.baseSelect.TotalPages = this.totalPages;
        this.initImagesModels().then(() => {
          this.initPanel();
        });
      } 
    }
  }

  addEventListeners(){
    this.divSelect.addEventListener("mousewheel", event => { this.scrollHorizontally(event, this.divSelect); } , false);
    this.divSelect.addEventListener('scroll', event => {
      clearTimeout(this.isScrolling);
      this.isScrolling = setTimeout(() => this.onScrollStop(event), 50);
      if(!this.scrollWidth) this.scrollWidth = this.divSelect.scrollWidth;
    }, false);
  }

  loadImagesOnScrolling(){
    this.scroll.emit(this.pageIndex = this.baseSelect.PageNumber);
  }
  
  async initImagesModels(){
    if(this.imagesList.length > this.baseSelect.PageSize) this.imagesList.slice(0, this.baseSelect.PageSize);
    for(let i = 0; i < this.imagesList.length; i++) this.imagesModels.push(new ImageModel(i, this.imagesList[i]));
  }

  scrollHorizontally(e, div: HTMLElement) {
    delta;
    e = window.event || e;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    div.scrollLeft -= (delta*40); // Multiplied by 40
    e.preventDefault();
  }

  initPanel(){
    this.leftScrollDiv = document.getElementById(this.leftScrollDivId);
    this.rightScrollDiv = document.getElementById(this.rightScrollDivId);
    if(this.leftScrollDiv && this.rightScrollDiv){
      this.leftScrollDiv.style.marginLeft = "0px";

      if(this.baseSelect.TotalRecords && this.imagesModels.length == this.baseSelect.PageSize){
        this.startBottomDivOffset = this.scrollConstOptionWidth * (this.baseSelect.TotalRecords - this.baseSelect.PageSize);
        this.rightScrollDiv.style.marginRight = this.startBottomDivOffset + 'px';
        this.maxPanelSize = (this.scrollConstOptionWidth * this.baseSelect.TotalRecords) + this.scrollConstOptionWidth;
      } else this.rightScrollDiv.style.marginRight = "0px";
      this.rightScrollDiv.style.height = "1px";
    }
  }

  getImages(){
    this.appendLoaderToPanel(this.divSelect);
    if(this.isLastPage) this.generateArrayOnLastPage(this.imagesList);
    else if(this.baseSelect.IsFastScroll) this.generateArrayOnFastScrolling(this.imagesList);
    else this.implementOnSlowScrolling(this.imagesList);
    this.imagesModels = this.checkArraySize(this.imagesModels);
    console.log(this.imagesModels);
    this.removeLoaderFromPanel(this.divSelect);
  }
  
  

  // method which gets scroll direction
  onScrollStop(event){
    if(this.needsToImplementInfiniteScroll(event.target.scrollLeft))
    {
      this.baseSelect.IsRolledDown = event.target.scrollLeft > this.scrollLeftOffset;
      this.scrollLeftOffset = event.target.scrollLeft > this.maxPanelSize ? this.maxPanelSize : event.target.scrollLeft;
      console.log("Left:" + this.scrollLeftOffset + ", Full Width:" + this.scrollWidth);
      this.loadAllOnScroll(this.scrollLeftOffset).then(() => {
        if(this.baseSelect.IsRolledDown) event.target.scrollLeft = this.scrollLeftOffset;
      });
    }
  }

  // method which checks is our scroll got out of top or bottom scope and gets scroll direction
  async loadAllOnScroll(scrollLeftOffset) {
    let pageNumAfterScroll = this.getPageNumberAfterScroll(scrollLeftOffset);
    console.log("Page number after scroll: " + pageNumAfterScroll);
    if(pageNumAfterScroll !== this.baseSelect.PageNumber){
      this.pageIndex = this.baseSelect.PageNumber;
      if(this.baseSelect.IsRolledDown){
        return await this.implementScrollingDown(scrollLeftOffset, pageNumAfterScroll).then(() => { 
          this.getImages();
          this.resizePanelDivs();
        });
      }
      else 
        return await this.implementScrollingUp(scrollLeftOffset, pageNumAfterScroll).then(() => { 
          this.getImages();
          this.resizePanelDivs(); 
        });
    }
    return null;
  }

  getPageNumberAfterScroll(scrollLeftOffset: number){
    let offsetToNextPage = this.scrollConstOptionWidth * this.baseSelect.SelectOffset;
    // look if scroll passed second page and has rest offset
    let restOffset = scrollLeftOffset - this.scrollConstOptionWidth * (this.baseSelect.SelectOffset + (this.baseSelect.SelectOffset / 2));
    let result = restOffset > 0 ? Math.floor((restOffset / offsetToNextPage) + 2) : 1;
    result = result == 0 ? 1 : result;
    return result;
  }

  async implementScrollingDown(scrollLeftOffset: number, pageNumAfterScroll: number){
    if(this.baseSelect.IsFastScrollingDown(pageNumAfterScroll))
    {
      return this.implementFastScrolling(pageNumAfterScroll);
    }
    else if(this.baseSelect.IsSlowScrollingDown(scrollLeftOffset, this.scrollConstOptionWidth))
    {
      if(this.baseSelect.IsScrollToTheLastPage(pageNumAfterScroll)) this.isLastPage = true;
      else{
        this.isLastPage = false;
        this.baseSelect.PageNumber++;
      }

      return await this.loadImagesOnScrolling();
    }
  }

  async implementScrollingUp(scrollLeftOffset: number, pageNumAfterScroll: number){
    if(this.baseSelect.IsFastScrollingUp(pageNumAfterScroll))
    {
      this.isLastPage = false;
      return this.implementFastScrolling(pageNumAfterScroll).then(() => { 
        this.getImages();
        this.resizePanelDivs(); 
      });
    } 
    else if(this.baseSelect.IsSlowScrollingUp(scrollLeftOffset, this.scrollConstOptionWidth))
    {
      this.isLastPage = false;
      this.baseSelect.PageNumber--;
      return await this.loadImagesOnScrolling();
    }
  }

  async implementFastScrolling(pageNumAfterScroll: number){
    this.baseSelect.IsFastScroll = true;
    if(this.baseSelect.IsScrollToTheLastPage(pageNumAfterScroll)){
      this.baseSelect.PageNumber = this.baseSelect.TotalPages;
      this.isLastPage = true;
    }
    else{
      this.isLastPage = false;
      this.baseSelect.PageNumber = pageNumAfterScroll == 1 ? pageNumAfterScroll : pageNumAfterScroll - 1;
    }

    return await this.loadImagesOnScrolling();
  }

  resizePanelDivs(){
    if(this.scrollArrayHasNewValues && this.leftScrollDiv && this.rightScrollDiv){
      let topOffset = this.scrollConstOptionWidth * (this.baseSelect.SelectOffset * (this.baseSelect.PageNumber - 1));
      let bottomOffset = this.startBottomDivOffset - topOffset;
      this.leftScrollDiv.style.marginLeft = (topOffset <= 0 ? 0 : topOffset) + 'px';
      this.leftScrollDiv.style.marginLeft = (topOffset > this.startBottomDivOffset ? this.startBottomDivOffset : topOffset) + 'px';
      this.rightScrollDiv.style.marginRight = (bottomOffset <= 0 || this.isLastPage ? 0 : bottomOffset) + 'px';
      this.baseSelect.IsFastScroll = false;
    }
  }

  needsToImplementInfiniteScroll(scrollLeft: number){
    return this.baseSelect.TotalPages > 1 && scrollLeft != this.scrollLeftOffset;
  }

  generateArrayOnFastScrolling(res: string[]){
    for(var i = 0; i < res.length; i++){
      let option = new ImageModel(i, res[i]);
      this.removeValueFromArray(this.imagesModels, i);
      this.addValueToArray(this.imagesModels, option);
    }
    this.scrollArrayHasNewValues = true;
  }

  generateArrayOnSlowScrolling(res: string[]){
    this.replaceValuesInArray(this.imagesModels);
    for(var i = 0; i < res.length; i++){
      let downBorder = this.baseSelect.PageSize - this.baseSelect.SelectOffset + i;
      let option = new ImageModel(i, res[i]);

      if(this.baseSelect.IsRolledDown){
        //change bottom values
        this.removeValueFromArray(this.imagesModels, downBorder);
        this.addValueToArray(this.imagesModels, option);
      } else{
        //change upper values
        this.removeValueFromArray(this.imagesModels, i);
        this.addValueToArray(this.imagesModels, option);
      }
    }
  }

  generateArrayOnLastPage(res: string[]){
    if(this.baseSelect.IsFastScroll){
      this.generateArrayOnFastScrolling(res);
      this.scrollArrayHasNewValues = true;
    } else{
      let newValues = this.getNewValuesFromArray(this.imagesModels, res);
      //replace elements
      for(let i = 0; i < this.imagesModels.length - (this.imagesModels.length - newValues.length); i++){
        this.imagesModels[i] = this.imagesModels[i+1];
      }
      //add new elements
      for(let i = 0; i < newValues.length; i++){
        let option = new ImageModel(this.imagesModels.length - newValues.length + i, newValues[i]);
        this.imagesModels[option.Id] = option;
      }
    }
  }

  implementOnSlowScrolling(items: string[]){
    let newValues = this.getNewValuesFromArray(this.imagesModels, items);
    if(newValues){
      this.generateArrayOnSlowScrolling(items);
      this.scrollArrayHasNewValues = true;
    } else this.scrollArrayHasNewValues = false;
  }

  getNewValuesFromArray(array: ImageModel[], values: string[]){
    var newValues = new Array();
    values.forEach(x => newValues.push(x));
    for(let i = 0; i < values.length; i++){
      let value = array.find(x => x.Value == values[i]);
      if(value){
        let index = newValues.indexOf(value.Value);
        newValues.splice(index, 1);
      }
    }
    return newValues;
  }

  addValueToArray(array: ImageModel[], option: ImageModel){
    let id = array.indexOf(null);
    if(id > -1){
      option.Id = id;
      array[id] = option;
      return id;
    } else{
      if(option){
        array.push(option);
        return array.length - 1;
      }
    }
  }

  removeValueFromArray(array: ImageModel[], id: number){
    if(array[id]) array[id] = null;
  }

  replaceValuesInArray(array: ImageModel[]){
    let cycleLength = array.length - this.baseSelect.SelectOffset;
      for(let i = 0; i < cycleLength; i++){
      if(this.baseSelect.IsRolledDown){
        this.removeValueFromArray(this.imagesModels, i);
        this.addValueToArray(this.imagesModels, this.imagesModels[this.baseSelect.SelectOffset + i]);
      } else{
        this.removeValueFromArray(this.imagesModels, this.baseSelect.PageSize - 1 - i);
        this.addValueToArray(this.imagesModels, this.imagesModels[cycleLength - 1 - i]);
      }
    }
  }

  checkArraySize(array: ImageModel[]){
    return array.length > this.baseSelect.PageSize 
      ? array = array.slice(0, this.baseSelect.PageSize) 
      : array;
  }

  appendLoaderToPanel(panel: HTMLElement){
    var loaderWrapper = document.createElement("div");
    loaderWrapper.id = "loader-wrapper";
    loaderWrapper.style.position = "relative";
    var loaderContentDiv = document.createElement("div");
    loaderContentDiv.style.position = "absolute";
    var loaderImage = document.createElement("img");
    loaderImage.src = "/assets/img/scroll_spinner.gif";
    loaderImage.style.display = "block";
    loaderImage.style.position = "absolute";
    loaderImage.style.left = "9em";
    loaderImage.style.top = "-3em";
    loaderImage.style.maxHeight = "11em";
    loaderContentDiv.appendChild(loaderImage);
    loaderWrapper.appendChild(loaderContentDiv);
    panel.insertBefore(loaderWrapper, panel.firstChild);
    panel.style.filter = "blur(2px)";
    panel.style.webkitFilter = "blur(2px)";
    panel.style.zIndex = "1";
  }

  removeLoaderFromPanel(panel: HTMLElement){
    if(panel){
      panel.style.filter = "blur(0)";
      panel.style.webkitFilter = "blur(0)";
      panel.style.zIndex = "1000";
    }
    var loader = document.getElementById(this.loaderId);
    if(loader) panel.removeChild(loader);
  }

  imageTransform(imgUploadUrl: string) : any{
    return this.sanitizer.bypassSecurityTrustResourceUrl(imgUploadUrl);
  }

  trackByFn(index, item) {
    return item.Id;
  }
}

export class ImageModel {
  Id: number;
  Value: string;

  constructor(id, value){
      this.Id = id;
      this.Value = value;
  }
}

export class BaseSelect {
  PageNumber: number;
  PageSize: number;
  TotalRecords: number;
  TotalPages: number;
  SelectOffset: number;
  SearchKey: string;
  IsRolledDown: boolean;
  IsFastScroll: boolean;

  constructor(pageNumber, pageSize, selectOffset){
      this.PageNumber = pageNumber;
      this.PageSize = pageSize;
      this.TotalRecords = 0;
      this.TotalPages = 0;
      this.SelectOffset = selectOffset;
      this.SearchKey = "";
      this.IsRolledDown = true;
      this.IsFastScroll = false;
  }

  IsFastScrollingUp(pageNumAfterScroll){
      return pageNumAfterScroll + 1 < this.PageNumber;
  }

  IsSlowScrollingUp(scrollTopOffset, scrollConstOptionHeight){
      return scrollTopOffset <= scrollConstOptionHeight * ((this.SelectOffset * this.PageNumber) + (this.SelectOffset / 2)) && this.PageNumber > 1;
  }

  IsFastScrollingDown(pageNumAfterScroll){
      return pageNumAfterScroll > this.PageNumber + 1;
  }

  IsSlowScrollingDown(scrollTopOffset, scrollConstOptionHeight){
      return scrollTopOffset >= scrollConstOptionHeight * ((this.SelectOffset * this.PageNumber) + (this.SelectOffset / 2));
  }

  IsScrollToTheLastPage(pageNumAfterScroll){
      return pageNumAfterScroll >= this.TotalPages + 1;
  }
}
