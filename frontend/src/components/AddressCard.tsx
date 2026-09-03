import { Box, Button, Card, CardActions, CardContent, Chip, Typography } from '@mui/material';
import type { Address } from '../api/types';

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (address: Address) => void;
}

export default function AddressCard({ address, onEdit, onDelete }: AddressCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }} data-testid="address-card">
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
        >
          <Typography variant="subtitle1" component="h3">
            {address.street}
          </Typography>
          <Chip size="small" label={address.type ?? 'HOME'} color="primary" variant="outlined" />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {[address.city, address.state].filter(Boolean).join(', ')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {address.zipCode} {address.country}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onEdit(address)}>
          Edit
        </Button>
        <Button size="small" color="error" onClick={() => onDelete(address)}>
          Delete
        </Button>
      </CardActions>
    </Card>
  );
}
