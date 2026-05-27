from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .hos_calculator import calculate_trip_plan


@api_view(['POST'])
def plan_trip(request):
    data = request.data
    required = ['current_location', 'pickup_location', 'dropoff_location']
    for field in required:
        if field not in data:
            return Response(
                {'error': f'Missing required field: {field}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    current_cycle_used = float(data.get('current_cycle_used', 0))
    if current_cycle_used < 0 or current_cycle_used > 70:
        return Response(
            {'error': 'current_cycle_used must be between 0 and 70'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = calculate_trip_plan(
            current_location=data['current_location'],
            pickup_location=data['pickup_location'],
            dropoff_location=data['dropoff_location'],
            current_cycle_used=current_cycle_used,
        )
        return Response(result, status=status.HTTP_200_OK)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {'error': f'Internal error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
