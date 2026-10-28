package com.stego.backend.security;

import com.stego.backend.entity.Restaurant;
import com.stego.backend.entity.User;
import com.stego.backend.enums.Role;
import com.stego.backend.repository.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.security.Principal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class StompAuthChannelInterceptorTest {

    @Mock private JwtUtils jwtUtils;
    @Mock private UserDetailsServiceImpl userDetailsService;
    @Mock private RestaurantRepository restaurantRepository;
    @InjectMocks private StompAuthChannelInterceptor interceptor;

    private UserDetailsImpl alice;
    private Principal aliceAuth;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        alice = UserDetailsImpl.build(user(7L, "alice@example.test"));
        aliceAuth = new UsernamePasswordAuthenticationToken(alice, null, alice.getAuthorities());
        User owner = user(9L, "owner@example.test");
        Restaurant restaurant = new Restaurant();
        restaurant.setId(3L);
        restaurant.setOwner(owner);
        when(restaurantRepository.findById(3L)).thenReturn(Optional.of(restaurant));
    }

    private static User user(Long id, String email) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setName(email);
        u.setPasswordHash("x");
        u.setRole(Role.ROLE_USER);
        return u;
    }

    private static Message<byte[]> stomp(StompCommand command, String destination, Principal user, String authHeader) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) accessor.setDestination(destination);
        if (user != null) accessor.setUser(user);
        if (authHeader != null) accessor.setNativeHeader("Authorization", authHeader);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void userCanFollowOwnOrdersOnly() {
        assertTrue(interceptor.maySubscribe(aliceAuth, "/topic/user/7/orders"));
        assertFalse(interceptor.maySubscribe(aliceAuth, "/topic/user/8/orders"));
    }

    @Test
    void onlyTheOwnerCanFollowARestaurantQueue() {
        assertFalse(interceptor.maySubscribe(aliceAuth, "/topic/restaurant/3/orders"));
        UserDetailsImpl owner = UserDetailsImpl.build(user(9L, "owner@example.test"));
        assertTrue(interceptor.maySubscribe(new UsernamePasswordAuthenticationToken(owner, null, owner.getAuthorities()),
                "/topic/restaurant/3/orders"));
    }

    @Test
    void anonymousAndUnknownDestinationsAreRefused() {
        assertFalse(interceptor.maySubscribe(null, "/topic/user/7/orders"));
        assertFalse(interceptor.maySubscribe(aliceAuth, "/topic/everything"));
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(stomp(StompCommand.SUBSCRIBE, "/topic/user/7/orders", null, null), null));
    }

    @Test
    void connectWithoutTokenIsRejected() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(stomp(StompCommand.CONNECT, null, null, null), null));
    }

    @Test
    void connectWithValidTokenAuthenticatesTheSession() {
        when(jwtUtils.validateJwtToken("good")).thenReturn(true);
        when(jwtUtils.getEmailFromJwtToken("good")).thenReturn("alice@example.test");
        when(userDetailsService.loadUserByUsername("alice@example.test")).thenReturn(alice);

        Message<?> out = interceptor.preSend(stomp(StompCommand.CONNECT, null, null, "Bearer good"), null);

        Principal user = StompHeaderAccessor.wrap(out).getUser();
        assertNotNull(user);
        assertSame(alice, ((UsernamePasswordAuthenticationToken) user).getPrincipal());
    }

    @Test
    void clientsCannotPublish() {
        assertThrows(MessageDeliveryException.class,
                () -> interceptor.preSend(stomp(StompCommand.SEND, "/topic/user/7/orders", aliceAuth, null), null));
    }
}
