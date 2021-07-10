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
   * Tokenize nlp
   * 
   * Tokensize of contents 
   * 
   * - first dimantion is representaton of paragraph
   * - second dimantion is representation of array of tokenized string
   */
  tokenized?: Array<Array<string>>
  
  /**
   * The words that Article use after tokenized by
   * 
   * list of String as Word
   */
  feature?: Array<string>;
}