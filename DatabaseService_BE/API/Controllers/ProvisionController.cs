using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Application.Services;
using Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProvisionController : ControllerBase
{
    private readonly ProvisionService _service;

    public ProvisionController(ProvisionService service)
    {
        _service = service;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(JwtRegisteredClaimNames.Sub) 
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Token không hợp lệ");
        }
        return userId;
    }

    [HttpPost]
    public async Task<ActionResult<ProvisionResponse>> Provision([FromBody] ProvisionRequest request)
    {
        try
        {
            var userId = GetUserId();
            var result = await _service.ProvisionAsync(request.PreferredName, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
    
    [HttpGet]
    public async Task<ActionResult<List<DatabaseInfoResponse>>> GetDatabases()
    {
        try
        {
            var userId = GetUserId();
            var databases = await _service.GetUserDatabasesAsync(userId);
            return Ok(databases);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DatabaseInfoResponse>> GetDatabase(int id)
    {
        try
        {
            var userId = GetUserId();
            var database = await _service.GetDatabaseInfoAsync(id, userId);
            if (database == null)
            {
                return NotFound(new { error = "Database không tồn tại" });
            }
            return Ok(database);

        }
        catch(UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDatabase(int id)
    {
        try
        {
            var userId = GetUserId();
            var success = await _service.DeleteDatabaseAsync(id,userId);
            if (success == false)
            if (!success)
            {
                return NotFound(new { error = "Database không tồn tại" });
            }
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

