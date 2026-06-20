// ══════════════════════════════════════════════════════════════════════════════
// Services barrel — single import point for the CMS service layer
// ══════════════════════════════════════════════════════════════════════════════

export { CmsApiClient } from './api';
export { BannersService } from './bannersService';
export { CategoriesService } from './categoriesService';
export { FeaturedStoresService } from './featuredStoresService';
export { FeaturedProductsService } from './featuredProductsService';
export { MediaService } from './mediaService';

import { CmsApiClient } from './api';
import { BannersService } from './bannersService';
import { CategoriesService } from './categoriesService';
import { FeaturedStoresService } from './featuredStoresService';
import { FeaturedProductsService } from './featuredProductsService';
import { MediaService } from './mediaService';

/** Create a fully wired CMS service bundle for a given API config */
export function createCmsServices(baseUrl: string, token: string) {
  const api = new CmsApiClient({ baseUrl, token });
  return {
    api,
    banners: new BannersService(api),
    categories: new CategoriesService(api),
    featuredStores: new FeaturedStoresService(api),
    featuredProducts: new FeaturedProductsService(api),
    media: new MediaService(api),
  };
}

export type CmsServices = ReturnType<typeof createCmsServices>;
