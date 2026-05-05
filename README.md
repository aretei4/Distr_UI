# Device4Autism — Distributor Delivery System

React + TypeScript + Vite frontend for the Device4Autism delivery management platform.

## Branch: `claude_v01`

This branch contains a **full UI redesign** with:

- **Dark collapsible sidebar** with active-route indicators and icon-only collapse mode
- **Design system** (`src/components/ui.tsx`) — shared `StatCard`, `DataTable`, `Btn`, `StatusBadge`, `Toast`, `SearchInput`, `Select`, `Card`, `PageHeader` components
- **Global CSS tokens** (`src/styles/globals.css`) — brand green palette, ink neutrals, status colours, radius/shadow variables, Syne + DM Sans fonts, stagger animations
- **Redesigned pages**: Login · Dashboard · Sales · Upload · DayEnd · DeliveryAgents · DeliveryTable · CustomerList · DeliveryPage · SalesDetail · DeliveryDetails · TemplateMappingPage

## Stack
- React 18 · TypeScript · Vite
- React Router v6
- Tailwind CSS (utility layer)
- jsPDF + jspdf-autotable · qrcode.react · xlsx · jsbarcode

## Getting Started

```bash
npm install
npm run dev
```

## Environment
Backend API defaults to `https://device4autism.in/api`.  
To use local backend, edit `src/constants/config.ts` and switch the `API_BASE_URL`.

## Pages

| Route | Page |
|-------|------|
| `/` | Login |
| `/dashboard` | Delivery Dashboard |
| `/sales` | Sales Picklist |
| `/sales/:picklistNo` | Sales Detail / Assign |
| `/upload` | Excel Upload |
| `/template` | Master Template Mapping |
| `/delivery` | Delivery Report |
| `/agents` | Delivery Agents |
| `/agents/:agentId` | Agent Picklist Detail |
| `/customer` | Customer List |
| `/dayEnd` | Day End Approval |
| `/details/:status` | Delivery Details |
