/**
 * Handles a service.
 */
export default interface Service<T, Y> {
  /**
   * @public
   * Creates a handler for a service request coming to the API.
   * @param {T} data The data to be processed by the service.
   * @returns {Promise<Y[]>} The array of results from service.
   */
  handler: (data: T) => Promise<Y>;
}
