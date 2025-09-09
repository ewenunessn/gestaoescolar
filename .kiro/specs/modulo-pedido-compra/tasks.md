# Implementation Plan

- [x] 1. Set up database schema and models



  - Create database migration script for carrinho, pedidos, and pedido_itens tables
  - Implement TypeScript interfaces for ProdutoContrato, CarrinhoItem, Pedido, and PedidoItem
  - Create database model functions for CRUD operations on new tables

  - _Requirements: 6.1, 6.2, 7.1_

- [x] 2. Implement backend API for product catalog


  - Create controller function to fetch products with contract information
  - Implement route GET /api/produtos/catalogo with filtering and pagination
  - Add middleware validation for catalog requests
  - Write unit tests for product catalog endpoint
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 3. Implement backend API for shopping cart operations






















  - Create controller functions for cart CRUD operations (add, get, update, delete)
  - Implement routes for POST /api/carrinho/adicionar, GET /api/carrinho, PUT /api/carrinho/alterar, DELETE /api/carrinho/:itemId
  - Add validation middleware for cart operations with contract limit checks
  - Write unit tests for all cart endpoints
  - _Requirements: 2.1, 2.2, 2.3, 7.2, 7.3_

- [x] 4. Implement backend API for order creation



  - Create controller function to generate orders from cart items
  - Implement route POST /api/pedidos with transaction handling
  - Add order number generation logic and cart cleanup after order confirmation
  - Write unit tests for order creation with various scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.4_

- [x] 5. Create React Context for cart state management





  - Implement CarrinhoContext with all required state and actions
  - Create custom hook useCarrinho for easy context consumption
  - Add error handling and loading states to context
  - Write unit tests for context state management
  - _Requirements: 6.4, 5.2, 5.3_

- [x] 6. Build product catalog frontend components





  - Create ProductCard component with product information display
  - Implement ProductDetailModal with quantity selection and add to cart functionality
  - Build CatalogoProdutos page component with product grid and filtering
  - Add cart indicator badges to show products already in cart
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Build shopping cart frontend components





  - Create CartItem component with quantity editing and remove functionality
  - Implement CarrinhoCompras page with grouping by supplier
  - Add subtotal calculations per supplier and general total
  - Create order confirmation dialogs for each supplier group
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Implement cart operations and order confirmation






  - Connect cart components to CarrinhoContext for state management
  - Implement add to cart functionality with validation feedback
  - Add quantity update and item removal with immediate UI updates
  - Create order confirmation flow with success feedback and cart cleanup
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.4, 4.5_

- [x] 9. Add responsive design and loading states





  - Implement responsive layouts for catalog and cart pages
  - Add loading spinners and skeleton screens for better UX
  - Create error handling with user-friendly messages and retry options
  - Add smooth transitions between catalog and cart navigation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Integrate with existing routing and navigation





  - Add new routes to React Router configuration
  - Update navigation menu to include catalog and cart links
  - Ensure proper authentication guards for new routes
  - Test navigation flow and state preservation between pages
  - _Requirements: 5.4, 6.3_

- [ ] 11. Add comprehensive validation and error handling
  - Implement frontend validation for quantity limits and required fields
  - Add backend validation middleware with detailed error messages
  - Create user feedback system for validation errors and success messages
  - Test edge cases like network failures and concurrent user actions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Write integration tests and final testing
  - Create end-to-end tests for complete catalog to order flow
  - Test concurrent user scenarios and cart state consistency
  - Validate contract limit enforcement across multiple users
  - Perform load testing on catalog and cart endpoints
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2_