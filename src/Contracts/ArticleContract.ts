export default interface ArticleContract {
  /**
   * Article Content
   */
  title?: string;
  
  /**
   * Place of Article
   */
  from?: string;
  
  /**
   * Article Category
   */
  category?: string;
  
  /**
   * Article Date
   */
  date?: string;
  
  /**
   * Link of Article
   */
  link?: string;
  
  /**
   * Content of Article
   * 
   * List of String as Paragraph Representation
   * 
   */
  contents?: Array<string>;
  
  /**
   * The words that Article use
   * 
   * list of String as Word
   */
  feature?: Array<string>;
}