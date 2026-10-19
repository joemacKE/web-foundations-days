# TicketHub: System Design

## 1. Requirements

### Functional requirements

TicketHub allows customers to discover events, select seats, purchase tickets, and access their tickets after payment.

The system must:

1. Allow users to register, sign in, and manage their accounts.
2. Browse, search, and filter events by name, date, venue, and category.
3. View event details, ticket prices, and seat availability.
4. Temporarily hold available seats while a customer completes checkout.
5. Process payments through a payment provider.
6. Confirm successful orders and issue tickets with unique identifiers.
7. Allow users to view their orders and purchased tickets.
8. Release expired seat holds and seats associated with failed payments.
9. Prevent duplicate payments and double-booking of seats.
10. Provide administrators with tools to manage events, seating plans, prices, and ticket availability.

### Non-functional requirements

**Speed:** Event listings and event details should load within approximately 300 ms at the 95th percentile under normal conditions, excluding unusually slow client connections. Seat availability and hold requests should normally respond within 500 ms. Payment confirmation may take longer because it depends on an external payment provider.

**Correctness:** A seat must never be sold to two customers. An order must not be confirmed until payment is verified. Duplicate requests and repeated payment callbacks must not create duplicate purchases.

**Fairness:** Customers should be admitted to a virtual waiting room during exceptionally popular sales. Requests should be processed according to a clearly communicated queue policy, such as queue-entry order, with reasonable bot protection. Customers must not gain an unfair advantage simply by refreshing repeatedly or opening many sessions.

**Availability:** Browsing should remain available during high traffic, and the system should degrade gracefully if a non-essential component fails. Payment and seat-allocation operations must fail safely rather than sell tickets incorrectly.

**Scalability:** The application should scale horizontally to handle large traffic spikes.

**Security:** Use HTTPS, authentication, authorization, rate limiting, secure payment-provider integration, and validation of all user input. Do not store raw payment-card details.

**Maintainability:** Separate browsing, seat allocation, ordering, and payment responsibilities so they can be monitored and updated independently.

## 2. Traffic and Capacity Estimates

### Normal-day traffic

Given:
- Registered users: 2,000,000
- Daily visitors: 50,000
- Pages viewed per visitor: 10
- Tickets sold daily: 5,000

**Page views per day**

50,000 visitors × 10 pages = **500,000 page views/day**

Average page-view rate:

500,000 ÷ 86,400 seconds = **5.8 page views/second**

For planning, assume normal peak traffic is 10 times the daily average:

5.8 × 10 = **58 page views/second**

Ticket sales rate:

5,000 ÷ 86,400 = **0.058 tickets/second**, or approximately 208 tickets/hour on average.

These averages do not mean sales happen evenly throughout the day. Real ticket sales may cluster around announcements and scheduled releases.

### Big-sale traffic

During a popular concert sale:
- People trying to purchase: 200,000
- Seats available: 20,000
- Sale window: 10 minutes = 600 seconds

Average incoming customer rate:

200,000 ÷ 600 = **333 customer attempts/second**

The potential demand is 10 times the available supply:

200,000 ÷ 20,000 = **10 customers per seat**

The system must handle approximately 333 arriving customer attempts per second on average during the sale window. Actual bursts may be considerably higher.

If each customer generates five API requests across browsing, seat selection, holding, and checkout, the sale could generate roughly:

333 × 5 = **1,665 API requests/second**

This is an illustrative estimate, not a guaranteed request rate. Retries, page assets, polling, and queue checks can increase the load. The design should therefore be load-tested above this level and provisioned with additional headroom.

### Comparison

| Metric | Normal day | Big sale |
|---|---:|---:|
| Visitors or purchase attempts | 50,000 visitors/day | 200,000 attempts/10 min |
| Page views or estimated workflow requests | 500,000 page views/day | About 1,665 API requests/sec under the five-request assumption |
| Average incoming rate | 5.8 page views/sec | 333 customer attempts/sec |
| Ticket demand | 5,000 tickets/day | 200,000 people competing for 20,000 seats |
| Supply pressure | Distributed demand | 10-to-1 demand-to-seat ratio |

The biggest challenge is not only the request volume. It is the contention created when many customers try to reserve the same limited seats simultaneously.

## 3. API Design

All endpoints use HTTPS and return JSON. Authenticated endpoints require a valid session or access token. Pagination, input validation, rate limits, and consistent error responses apply throughout.

### Endpoint list

| Method and endpoint | Purpose | Success response |
|---|---|---|
| `GET /api/events` | Browse and search events; supports filters and pagination | `200 OK` |
| `GET /api/events/{eventId}` | View event details, venue, date, and pricing | `200 OK` |
| `GET /api/events/{eventId}/seats` | View seat identifiers, prices, and availability | `200 OK` |
| `POST /api/holds` | Temporarily hold selected seats for the authenticated customer | `201 Created` |
| `DELETE /api/holds/{holdId}` | Release an active hold when checkout is abandoned | `204 No Content` |
| `POST /api/orders` | Create an order from a valid seat hold and initiate payment | `201 Created` |
| `POST /api/payments/webhook` | Receive and verify payment-provider status notifications | `200 OK` |
| `GET /api/me/tickets` | View the authenticated user's confirmed tickets | `200 OK` |
| `GET /api/orders/{orderId}` | View order status and payment outcome | `200 OK` |

### Example: browse events

Request:

`GET /api/events?date=2026-12-01&page=1&limit=20`

Example response:

```json
{
  "items": [
    {
      "id": "evt_101",
      "name": "Live Music Night",
      "startsAt": "2026-12-01T19:00:00Z",
      "venue": "City Arena",
      "availableSeats": 1200
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

The event list can be cached briefly, but exact seat availability must be checked against the authoritative seat-allocation system before a hold is accepted.

### Example: hold seats

Request:

`POST /api/holds`

```json
{
  "eventId": "evt_101",
  "seatIds": ["seat_A12", "seat_A13"]
}
```

Example success response:

```json
{
  "holdId": "hold_789",
  "status": "ACTIVE",
  "seatIds": ["seat_A12", "seat_A13"],
  "expiresAt": "2026-12-01T18:10:00Z"
}
```

The server must atomically acquire all requested seats or reject the entire request. If any requested seat is unavailable, the API should return `409 Conflict` without leaving a partial hold.

### Example: create an order

Request:

`POST /api/orders`

```json
{
  "holdId": "hold_789",
  "idempotencyKey": "checkout-7f19a2"
}
```

Example response:

```json
{
  "orderId": "ord_456",
  "status": "PENDING_PAYMENT",
  "amount": 12000,
  "currency": "KES"
}
```

The server calculates the amount from trusted event and seat prices, not from a client-supplied total. The idempotency key ensures that a retry does not create another order for the same checkout operation.

### Error responses

Errors use appropriate HTTP status codes, such as:
- `400 Bad Request`: Invalid input.
- `401 Unauthorized`: Missing or invalid authentication.
- `403 Forbidden`: The user is not allowed to access the resource.
- `404 Not Found`: The event, seat, hold, or order does not exist.
- `409 Conflict`: A seat is unavailable, a hold has expired, or a conflicting operation exists.
- `429 Too Many Requests`: The client has exceeded its rate limit.
- `500 Internal Server Error`: An unexpected server error.

Example:

```json
{
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "One or more selected seats are no longer available."
  }
}
```

## 4. Data Model

Use PostgreSQL as the primary relational database because orders, payments, seat assignments, and seat holds require strong consistency and transactional guarantees.

### Tables and relationships

**Users**
- `id`: UUID, primary key
- `name`: VARCHAR(150), required
- `email`: VARCHAR(255), unique and required
- `password_hash`: VARCHAR(255), required
- `created_at`: TIMESTAMPTZ, required

**Events**
- `id`: UUID, primary key
- `name`: VARCHAR(200), required
- `venue`: VARCHAR(200), required
- `starts_at`: TIMESTAMPTZ, required
- `status`: VARCHAR(30), required
- `created_at`: TIMESTAMPTZ, required

**Seats**
- `id`: UUID, primary key
- `event_id`: UUID, foreign key referencing `events(id)`
- `seat_label`: VARCHAR(30), required
- `price`: NUMERIC(10,2), required
- `status`: VARCHAR(20), required
- `hold_id`: UUID, nullable
- `hold_expires_at`: TIMESTAMPTZ, nullable
- `order_id`: UUID, nullable
- `created_at`: TIMESTAMPTZ, required

Each seat belongs to one event. Add a unique constraint on `(event_id, seat_label)` so the same seat cannot be defined twice for one event.

**Orders**
- `id`: UUID, primary key
- `user_id`: UUID, foreign key referencing `users(id)`
- `status`: VARCHAR(30), required
- `amount`: NUMERIC(12,2), required
- `currency`: CHAR(3), required
- `idempotency_key`: VARCHAR(100), required
- `payment_reference`: VARCHAR(200), nullable and unique when present
- `created_at`: TIMESTAMPTZ, required
- `paid_at`: TIMESTAMPTZ, nullable

Add a unique constraint on `(user_id, idempotency_key)` to prevent duplicate orders when the same authenticated customer retries a request.

A production implementation would also use a separate payment table to track provider transactions and webhook events. For this four-table core model, payment status is represented by the order status and verified payment reference.

### Relationship summary

- One user can have many orders.
- One event can have many seats.
- One order can purchase multiple seats.
- A seat can belong to no order before sale, or to one confirmed order after sale.
- Seat holds are temporary and expire; they do not constitute completed purchases.

### Example SQL schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    venue VARCHAR(200) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    payment_reference VARCHAR(200) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    UNIQUE (user_id, idempotency_key)
);

CREATE TABLE seats (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    seat_label VARCHAR(30) NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    hold_id UUID,
    hold_expires_at TIMESTAMPTZ,
    order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, seat_label)
);

CREATE INDEX idx_events_status_starts_at
    ON events (status, starts_at);

CREATE INDEX idx_seats_event_status
    ON seats (event_id, status);

CREATE INDEX idx_orders_user_created
    ON orders (user_id, created_at DESC);
```

For a production system, seat state changes should be validated by transactions and database constraints, not trusted to application code alone. If a separate holds table is introduced, it should contain hold ownership and expiry details, and the schema should enforce valid references.

## 5. Architecture

### Architecture diagram

```text
                         Customers
                             |
                       DNS / HTTPS
                             |
                      CDN (static assets)
                             |
                   Load Balancer / API Gateway
                             |
                 Virtual Waiting Room / Queue
                             |
              +--------------+--------------+
              |                             |
        Application A                 Application B
              |                             |
              +-------------+---------------+
                            |
                 Ticketing / Seat Service
                            |
               +------------+-------------+
               |                          |
        PostgreSQL Primary          Redis Cache
       (authoritative writes)    (browse data / queue)
               |
        Read Replicas
         (read-heavy queries)

       Application / Order Service
                   |
             Payment Provider
                   |
          Verified Webhook Events
                   |
          Order Confirmation Worker
                   |
        Email / Ticket Delivery Service

       Metrics, Logs, Traces and Alerts
          across all components
```

### Component explanations

**DNS and HTTPS:** Direct customers to the service and encrypt communication.

**CDN:** Serves static JavaScript, CSS, images, and other cacheable assets without sending every request to the application servers.

**Load balancer/API gateway:** Distributes requests across healthy application instances and provides a central place for request limits, routing, and basic protection.

**Virtual waiting room:** Controls the rate at which customers enter the purchase flow during the big sale. A fair queue policy prevents the backend from being overwhelmed by all 200,000 customers at once.

**Application servers:** Handle event browsing, authentication, validation, and API requests. They are stateless, so any healthy instance can process a request.

**Ticketing/seat service:** Owns seat holds, expiration, allocation, and order creation. All critical seat changes use database transactions and constraints.

**PostgreSQL primary:** The source of truth for seats, holds, and orders. Writes go to the primary so allocation decisions are made against current authoritative state.

**Read replicas:** Serve suitable read-heavy queries, such as event listings and historical orders. Seat availability used to make a purchase decision must be verified against the primary or another mechanism with equivalent strong consistency.

**Redis cache:** Reduces load for event metadata and other cacheable data. It is not the final authority for whether a seat can be sold.

**Payment provider:** Securely processes payments. The application uses provider references and verified callbacks rather than trusting the customer's browser to report payment success.

**Confirmation worker and delivery service:** Processes confirmed orders, issues tickets, and sends notifications asynchronously so slow email delivery does not block checkout.

**Monitoring:** Collects request latency, error rates, queue depth, database performance, payment outcomes, and seat-allocation conflicts.

### How the system handles the big sale

1. Customers enter the virtual waiting room. The queue releases customers at a rate the application and database can handle.
2. Event information and static assets are served from caches and the CDN where appropriate.
3. The load balancer distributes admitted requests across multiple stateless application instances.
4. The seat service performs atomic seat holds using PostgreSQL transactions. If two requests target the same seat, only one can successfully claim it.
5. Holds expire after a defined checkout period. Expired holds are released using safe, conditional database updates.
6. Orders are created with idempotency keys. Payment requests are handled through a payment provider.
7. A verified payment result changes the order and seat state in a transaction. A failed or expired checkout does not become a confirmed sale.
8. Confirmation and email delivery run asynchronously. The database and queue are monitored and scaled as demand changes.

### Specifically, how double-booking is prevented

A seat must move through controlled states such as `AVAILABLE`, `HELD`, and `SOLD`. The application must not read a seat as available and then update it in a separate, unprotected operation, because another request could claim it in between.

For example, a seat can be held with a conditional database update:

```sql
BEGIN;

UPDATE seats
SET status = 'HELD',
    hold_id = :hold_id,
    hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = :seat_id
  AND status = 'AVAILABLE';

-- The application checks the affected row count.
-- Exactly one row means the claim succeeded.
-- Zero rows means the seat was not available.

COMMIT;
```

For multiple seats, all requested seats must be claimed within one transaction. The service checks that every requested seat was successfully claimed. If any seat cannot be claimed, it rolls back the transaction so the customer does not receive a partial hold.

During payment confirmation, the service verifies that the hold belongs to the customer, has not expired, and has not already been consumed. It then changes the order to paid and the relevant seats to sold in one transaction. Conditional updates ensure that only a valid active hold can be finalized.

Database uniqueness constraints prevent duplicate seat definitions, while order idempotency keys and unique payment references prevent repeated requests or callbacks from creating duplicate purchases. Concurrent requests must be handled by the database's locking and transaction mechanisms, not by relying on application-server memory.

Payment network calls should not be held open inside long-running database transactions. Instead, the system creates a pending order, communicates with the payment provider, and finalizes the order safely when the verified result arrives. A reconciliation process handles uncertain outcomes, such as a payment succeeding while a callback is delayed.

## 6. Trade-offs

### Trade-off 1: Fairness versus immediate access

A virtual waiting room introduces an extra step and may make some customers wait even when the service still has spare capacity. However, it protects the system from sudden spikes and creates a more consistent, auditable admission policy. For a high-demand concert, fairness and correctness are more important than admitting everyone immediately.

### Trade-off 2: Strong consistency versus read performance

Sending every read to the primary database simplifies consistency but can overload it during a large sale. Read replicas and caches improve throughput, but replicas can lag and cached availability can become stale. TicketHub therefore uses caches for event information while keeping seat allocation and final purchase decisions on the authoritative database.

### Trade-off 3: Short holds versus checkout completion

Short holds free seats quickly for other customers but can expire while a legitimate customer is completing payment. Longer holds improve the customer experience but allow seats to remain unavailable without a completed purchase. A reasonable hold duration, clear countdowns, and safe expiry handling balance these competing goals.

### Trade-off 4: Synchronous versus asynchronous processing

Performing email delivery and all post-purchase tasks during checkout makes the purchase request slower and less reliable. Processing those tasks asynchronously improves responsiveness, but requires retries, monitoring, and idempotent workers to avoid lost or duplicated notifications.

## Conclusion

TicketHub needs to handle ordinary browsing efficiently while protecting the correctness and fairness of limited ticket inventory during major sales. Horizontal scaling, a waiting room, caching of non-critical data, and asynchronous processing help absorb traffic spikes. PostgreSQL transactions, conditional seat updates, unique constraints, and idempotent payment handling ensure that a seat can only be sold once.