export interface IFrameReplaceMessageData {
  msgType:"edit"|"requestEditMode"
  prototype:string,
  outerHTML:string
  tagName:string,
  textContent:string,
  baseURI:string
}
