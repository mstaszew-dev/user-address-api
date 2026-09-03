import { Container, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        About
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          What is this app?
        </Typography>
        <Typography variant="body1" paragraph>
          A user and address management application for administrators. One user can hold multiple
          addresses, and each address belongs to exactly one user. The frontend is built with React
          and Material UI; the backend is a Java 17 / Spring Boot REST API with JWT authentication
          backed by an in-memory store.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Design Choices
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="User to Address flow"
              secondary="The user list shows all users; the Manage action opens a detail page where the profile is edited via a dialog and addresses are managed as cards. The 1-to-many relationship is presented in one focused place."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="State management"
              secondary="React hooks only (useState, useEffect, Context for the session). Data is refetched after each mutation, keeping state simple and always consistent with the server."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Navigation"
              secondary="React Router with guarded routes: /users and /users/:id require a token, /login and /about are public. The list and detail views are linked both ways."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Material UI"
              secondary="Standard MUI components (Table, Cards, Dialogs, App Bar) with a single dark theme. No heavy component packages; the list uses the standard Table to keep the bundle light."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Authorization"
              secondary="JWT login with an intentional admin-flat model: any authenticated user can manage users and addresses."
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Pragmatic API"
              secondary="User creation reuses the public register endpoint; role changes happen through the profile edit endpoint. No persistence layer is required for this assessment."
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
}
